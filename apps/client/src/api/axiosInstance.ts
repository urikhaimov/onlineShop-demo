// src/api/axiosInstance.ts
import axios, {
  AxiosError,
  AxiosHeaders,
  InternalAxiosRequestConfig,
} from 'axios';
import { auth } from '../firebase';
// import i18n from '@/i18n'; // uncomment if you want locale headers

/**
 * Base URL:
 * - default: '/api' which Vite proxies to http://localhost:3000/api in dev
 * - override with VITE_API_BASE (e.g. 'http://localhost:3000/api' or a prod URL)
 */
const baseURL = (import.meta.env.VITE_API_BASE as string) || '/api';

const axiosInstance = axios.create({
  baseURL,
  withCredentials: true,
});

function ensureHeaders(
  headers: InternalAxiosRequestConfig['headers'],
): AxiosHeaders {
  return AxiosHeaders.from(headers || {});
}

/**
 * Attach Firebase ID token to each request when signed in.
 */
axiosInstance.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const user = auth.currentUser;
    const headers = ensureHeaders(config.headers);

    if (user) {
      // latest non-forced token (fast path)
      const token = await user.getIdToken();
      headers.set('Authorization', `Bearer ${token}`);
    }

    // Optional locale headers (both are allowed by your API CORS)
    // const lang = i18n?.language ?? 'en';
    // headers.set('Accept-Language', lang);
    // headers.set('x-lang', lang);

    config.headers = headers;
    return config;
  },
  (error) => Promise.reject(error),
);

/**
 * One-time 401 retry after forcing a fresh token.
 */
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

        // // Optional: reapply locale on retry
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
