import axios from 'axios';
import type { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

export const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach access token from localStorage
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem('pob-auth');
    if (raw) {
      const parsed = JSON.parse(raw) as { state?: { accessToken?: string } };
      const token = parsed?.state?.accessToken;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
  }
  return config;
});

// Auto-refresh on 401
apiClient.interceptors.response.use(
  (res: AxiosResponse) => res,
  async (error: unknown) => {
    const axiosError = error as { config?: InternalAxiosRequestConfig & { _retry?: boolean }; response?: { status: number } };
    const originalRequest = axiosError.config;

    if (axiosError.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const raw = localStorage.getItem('pob-auth');
        if (raw) {
          const parsed = JSON.parse(raw) as { state?: { refreshToken?: string } };
          const refreshToken = parsed?.state?.refreshToken;
          if (refreshToken) {
            const { data } = await axios.post<{ data: { accessToken: string } }>(
              `${BASE_URL}/auth/refresh`,
              { refreshToken },
            );
            const newToken = data.data.accessToken;
            const stored = JSON.parse(localStorage.getItem('pob-auth') ?? '{}') as { state?: { accessToken?: string } };
            if (stored.state) stored.state.accessToken = newToken;
            localStorage.setItem('pob-auth', JSON.stringify(stored));
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return apiClient(originalRequest);
          }
        }
      } catch {
        localStorage.removeItem('pob-auth');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  },
);
