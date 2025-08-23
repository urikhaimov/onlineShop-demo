// src/api/axiosInstance.ts
import axios, { InternalAxiosRequestConfig } from 'axios';
import { getFirebaseToken } from '../utils/getFirebaseToken';
import i18n from '../i18n/i18n';

const axiosInstance = axios.create({
  baseURL: '/api',
});

axiosInstance.interceptors.request.use(
  async (
    config: InternalAxiosRequestConfig,
  ): Promise<InternalAxiosRequestConfig> => {
    const token = await getFirebaseToken();
    const lng = (i18n.language || 'en').split('-')[0] as 'en' | 'he';

    // Ensure headers exists
    if (!config.headers)
      config.headers = {} as import('axios').AxiosRequestHeaders;

    // Axios v1: headers can be AxiosHeaders (with .set) or a plain object
    const h = config.headers as any;

    if (typeof h.set === 'function') {
      h.set('Accept-Language', lng);
      h.set('x-lang', lng); // optional override for your API
      if (token) h.set('Authorization', `Bearer ${token}`);
    } else {
      h['Accept-Language'] = lng;
      h['x-lang'] = lng; // optional
      if (token) h['Authorization'] = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

export default axiosInstance;
