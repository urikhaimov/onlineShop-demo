// src/api/axiosInstance.ts
import axios, {
  AxiosError,
  AxiosHeaders,
  InternalAxiosRequestConfig,
} from 'axios';
import { auth } from '../firebase';
// import i18n from '../i18n'; // uncomment if you want Accept-Language

/**
 * Create a preconfigured Axios instance for your API.
 * - baseURL: '/api' (proxy to http://localhost:3000/api in dev)
 * - withCredentials: true (cookies if you ever use them)
 */
const axiosInstance = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

/**
 * Ensure headers are an AxiosHeaders object (Axios v1)
 */
function ensureHeaders(
  headers: InternalAxiosRequestConfig['headers'],
): AxiosHeaders {
  return AxiosHeaders.from(headers || {});
}

/**
 * Attach Firebase ID token to every request when signed in.
 */
axiosInstance.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const user = auth.currentUser;

    // Public endpoints don't need a token, but it's safe to send one.
    // If you prefer to skip, you can whitelist paths here.

    // Always ensure proper headers type first
    const headers = ensureHeaders(config.headers);

    if (user) {
      // Get the latest (non-forced) token
      const token = await user.getIdToken();
      headers.set('Authorization', `Bearer ${token}`);
    }

    // Optional locale header
    // headers.set('Accept-Language', i18n?.language ?? 'en');

    config.headers = headers;
    return config;
  },
  (error) => Promise.reject(error),
);

/**
 * One-time 401 retry with a forced token refresh.
 */
axiosInstance.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const cfg = error.config as
      | (InternalAxiosRequestConfig & {
          _retry?: boolean;
        })
      | undefined;

    const status = error.response?.status;

    // Only attempt refresh/rehit if:
    // - we have a config
    // - it was a 401
    // - we haven't retried this exact request yet
    // - and a user is signed in
    if (cfg && status === 401 && !cfg._retry && auth.currentUser) {
      try {
        cfg._retry = true;

        // Force refresh the token
        const fresh = await auth.currentUser.getIdToken(true);

        // Make sure headers are in the right shape before retrying
        const headers = ensureHeaders(cfg.headers);
        headers.set('Authorization', `Bearer ${fresh}`);
        // headers.set('Accept-Language', i18n?.language ?? 'en');
        cfg.headers = headers;

        return axiosInstance(cfg);
      } catch {
        // fall through to reject
      }
    }

    return Promise.reject(error);
  },
);

export default axiosInstance;
