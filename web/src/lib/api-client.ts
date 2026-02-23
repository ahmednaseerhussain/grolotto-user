import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://grolotto-user.onrender.com/api";

// Token management
const getAccessToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("groloto_access_token");
};

const getRefreshToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("groloto_refresh_token");
};

const setTokens = (accessToken: string, refreshToken: string) => {
  localStorage.setItem("groloto_access_token", accessToken);
  localStorage.setItem("groloto_refresh_token", refreshToken);
};

const clearTokens = () => {
  localStorage.removeItem("groloto_access_token");
  localStorage.removeItem("groloto_refresh_token");
};

// Force-logout via Zustand store to clear both in-memory and persisted auth state
const forceLogout = () => {
  clearTokens();
  try {
    // Clear persisted store auth state directly (works even if Zustand hasn't initialized)
    const raw = localStorage.getItem("grolotto-web-store");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.state) {
        parsed.state.user = null;
        parsed.state.isAuthenticated = false;
        localStorage.setItem("grolotto-web-store", JSON.stringify(parsed));
      }
    }
  } catch {}
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
};

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor — attach token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle 401 with token refresh
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        forceLogout();
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        const newAccessToken = data.data?.accessToken || data.data?.tokens?.accessToken || data.accessToken || data.tokens?.accessToken;
        const newRefreshToken = data.data?.refreshToken || data.data?.tokens?.refreshToken || data.refreshToken || data.tokens?.refreshToken;

        if (newAccessToken) {
          setTokens(newAccessToken, newRefreshToken || refreshToken);
          processQueue(null, newAccessToken);
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
        forceLogout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export { apiClient, setTokens, clearTokens, getAccessToken, getRefreshToken };

// Error helper
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || error.response?.data?.error || error.message;
  }
  if (error instanceof Error) return error.message;
  return "An unexpected error occurred";
}
