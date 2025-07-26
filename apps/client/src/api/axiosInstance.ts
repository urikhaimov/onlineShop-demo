// src/api/axiosInstance.ts
import axios, { InternalAxiosRequestConfig } from 'axios';
import { getFirebaseToken } from '../utils/getFirebaseToken';

const axiosInstance = axios.create({
  baseURL: '/api',
});

axiosInstance.interceptors.request.use(
  async (
    config: InternalAxiosRequestConfig,
  ): Promise<InternalAxiosRequestConfig> => {
    const token = await getFirebaseToken();

    if (token && config.headers) {
      config.headers.set?.('Authorization', `Bearer ${token}`);
    }

    return config;
  },
  (error) => Promise.reject(error),
);

export default axiosInstance;
