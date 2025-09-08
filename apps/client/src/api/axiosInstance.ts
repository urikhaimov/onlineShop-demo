// src/api/axiosInstance.ts
import axios, {
  AxiosError,
  AxiosHeaders,
  InternalAxiosRequestConfig,
} from 'axios';
import { auth } from '../firebase';
// import i18n from '@/i18n'; // uncomment if you want locale headers

/**
 * Base URL resolution (order of precedence):
 * 1) VITE_API_BASE        -> e.g. http://localhost:3000/api
 * 2) VITE_API_ORIGIN      -> e.g. http://localhost:3000  (we append /api)
 * 3) '/api'               -> Vite proxy in dev / Hosting rewrite in prod
 */
const origin = import.meta.env.VITE_API_ORIGIN as string | undefined;
const baseURL =
  (import.meta.env.VITE_API_BASE as string) ||
  (origin ? `${origin}/api` : '/api');

const axiosInstance = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 10_000,
});

if (import.meta.env.DEV) {
  // Helps verify you’re not accidentally hitting :5173

  console.log('[api] baseURL =', baseURL);
}

function ensureHeaders(
  headers: InternalAxiosRequestConfig['headers'],
): AxiosHeaders {
  return AxiosHeaders.from(headers || {});
}

/** Attach Firebase ID token to each request when signed in. */
axiosInstance.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const user = auth.currentUser;
    const headers = ensureHeaders(config.headers);

    // Always ask for JSON
    headers.set('Accept', 'application/json');

    if (user) {
      const token = await user.getIdToken(); // fast path (cached unless expired)
      headers.set('Authorization', `Bearer ${token}`);
    }

    // Optional locale headers
    // const lang = i18n?.language ?? 'en';
    // headers.set('Accept-Language', lang);
    // headers.set('x-lang', lang);

    config.headers = headers;
    return config;
  },
  (error) => Promise.reject(error),
);

/** One-time 401 retry after forcing a fresh token. */
axiosInstance.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const cfg = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;

    if (
      cfg &&
      error.response?.status === 401 &&
      !cfg._retry &&
      auth.currentUser
    ) {
      try {
        cfg._retry = true;
        const fresh = await auth.currentUser.getIdToken(true);
        const headers = ensureHeaders(cfg.headers);
        headers.set('Authorization', `Bearer ${fresh}`);

        // const lang = i18n?.language ?? 'en';
        // headers.set('Accept-Language', lang);
        // headers.set('x-lang', lang);

        cfg.headers = headers;
        return axiosInstance(cfg);
      } catch {
        // fall through
      }
    }
    return Promise.reject(error);
  },
);

export default axiosInstance;
