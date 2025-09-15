// src/api/axiosInstance.ts
import axios, {
  AxiosError,
  AxiosHeaders,
  InternalAxiosRequestConfig,
} from 'axios';
import { auth } from '../firebase';

const origin = import.meta.env.VITE_API_ORIGIN as string | undefined;
const baseURL =
  (import.meta.env.VITE_API_BASE as string) ||
  (origin ? `${origin}/api` : '/api'); // requires Vite proxy when relative

const axiosInstance = axios.create({
  baseURL,
  // ❗ Usually NOT needed for Bearer tokens and can break CORS:
  withCredentials: false,
  timeout: 10_000,
});

if (import.meta.env.DEV) {
  console.log('[api] baseURL =', baseURL);
}

// Helper to normalize headers type
function ensureHeaders(h: InternalAxiosRequestConfig['headers']): AxiosHeaders {
  return AxiosHeaders.from(h || {});
}

/** Attach Firebase ID token when available. */
axiosInstance.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const headers = ensureHeaders(config.headers);
    headers.set('Accept', 'application/json');

    const user = auth.currentUser;
    if (user) {
      // uses cached token unless expired
      const token = await user.getIdToken();
      headers.set('Authorization', `Bearer ${token}`);
    }

    config.headers = headers;

    if (import.meta.env.DEV) {
      const url = (config.baseURL ?? '') + (config.url ?? '');
      // minimal dev trace
      console.debug(
        '[api:req]',
        config.method?.toUpperCase(),
        url,
        headers.get('Authorization') ? 'auth' : 'no-auth',
      );
    }
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
        cfg.headers = headers;

        if (import.meta.env.DEV) {
          console.debug(
            '[api:retry]',
            cfg.method?.toUpperCase(),
            (cfg.baseURL ?? '') + (cfg.url ?? ''),
          );
        }
        return axiosInstance(cfg); // will not infinite-loop because _retry is set
      } catch {
        // fall through to reject
      }
    }

    if (import.meta.env.DEV) {
      const status = error.response?.status;
      const url = error.config
        ? (error.config.baseURL ?? '') + (error.config.url ?? '')
        : '(no-config)';
      console.warn('[api:err]', status, url, error.response?.data);
    }
    return Promise.reject(error);
  },
);

export default axiosInstance;
