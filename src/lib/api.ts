import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || "https://localhost:7000",
  headers: {
    "Content-Type": "application/json",
  },
});

// ============================================================================
// Global Error Handler - dispatch events for toast notifications
// ============================================================================
type ApiErrorEvent = {
  message: string;
  status?: number;
};

const API_ERROR_EVENT = "api-error";

export function dispatchApiError(error: ApiErrorEvent) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(API_ERROR_EVENT, { detail: error }));
  }
}

export function onApiError(callback: (error: ApiErrorEvent) => void) {
  if (typeof window !== "undefined") {
    const handler = (e: Event) => callback((e as CustomEvent<ApiErrorEvent>).detail);
    window.addEventListener(API_ERROR_EVENT, handler);
    return () => window.removeEventListener(API_ERROR_EVENT, handler);
  }
  return () => {};
}

// Helper to extract error message from API response
function getErrorMessage(error: AxiosError): string {
  const data = error.response?.data as any;

  // Try to get error message from response
  if (data?.error) return data.error;
  if (data?.message) return data.message;
  if (data?.errors && Array.isArray(data.errors)) {
    return data.errors.join(", ");
  }

  // Default messages based on status
  const status = error.response?.status;
  switch (status) {
    case 500:
      return "Lỗi máy chủ. Vui lòng thử lại sau.";
    case 502:
      return "Máy chủ không phản hồi. Vui lòng thử lại sau.";
    case 503:
      return "Dịch vụ tạm thời không khả dụng.";
    case 504:
      return "Máy chủ phản hồi quá lâu. Vui lòng thử lại.";
    default:
      return "Đã xảy ra lỗi. Vui lòng thử lại.";
  }
}

// Flag to prevent infinite refresh loops
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: AxiosError | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("auth_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Handle 401 Unauthorized - token expired or invalid
    if (error.response?.status === 401 && typeof window !== "undefined") {
      console.log("[API] 401 Unauthorized received for:", originalRequest.url);

      // Don't retry if this is already a retry or if it's the refresh endpoint itself
      if (originalRequest._retry || originalRequest.url?.includes("/auth/refresh") || originalRequest.url?.includes("/auth/login")) {
        console.log("[API] Cannot retry - already retried or auth endpoint");
        // Clear stored auth data and redirect to login
        localStorage.removeItem("auth_token");
        localStorage.removeItem("auth_refresh_token");
        localStorage.removeItem("auth_user");
        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
        return Promise.reject(error);
      }

      // Try to refresh the token
      const refreshToken = localStorage.getItem("auth_refresh_token");
      if (!refreshToken) {
        // No refresh token, redirect to login
        localStorage.removeItem("auth_token");
        localStorage.removeItem("auth_user");
        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            // Retry with new token
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Call refresh token endpoint
        console.log("[Refresh Token] Attempting to refresh token...");
        const response = await api.post("/admin/v1/auth/refresh", {
          refreshToken,
        });

        console.log("[Refresh Token] Response:", response.data);

        if (response.data?.success && response.data?.data?.accessToken && response.data?.data?.refreshToken) {
          console.log("[Refresh Token] Success! New tokens received");
          const newAccessToken = response.data.data.accessToken;
          const newRefreshToken = response.data.data.refreshToken;

          // Update stored tokens
          localStorage.setItem("auth_token", newAccessToken);
          localStorage.setItem("auth_refresh_token", newRefreshToken);

          // Update user data in storage
          const storedUser = localStorage.getItem("auth_user");
          if (storedUser) {
            const user = JSON.parse(storedUser);
            user.accessToken = newAccessToken;
            user.refreshToken = newRefreshToken;
            user.expiresAt = response.data.data.expiresAt || user.expiresAt;
            localStorage.setItem("auth_user", JSON.stringify(user));
          }

          // Update Authorization header for retry
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

          // Process queued requests
          processQueue(null, newAccessToken);

          isRefreshing = false;

          // Retry original request
          return api(originalRequest);
        } else {
          console.error("[Refresh Token] Invalid response format:", response.data);
          throw new Error("Refresh token failed");
        }
      } catch (refreshError) {
        // Refresh failed, clear auth and redirect
        console.error("[Refresh Token] Error:", refreshError);
        processQueue(refreshError as AxiosError, null);
        isRefreshing = false;

        localStorage.removeItem("auth_token");
        localStorage.removeItem("auth_refresh_token");
        localStorage.removeItem("auth_user");

        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }

        return Promise.reject(refreshError);
      }
    }

    // Handle 5xx Server Errors - dispatch global error event
    const status = error.response?.status;
    if (status && status >= 500 && status < 600) {
      console.error(`[API] Server Error ${status}:`, error.response?.data);
      dispatchApiError({
        message: getErrorMessage(error),
        status,
      });
    }

    return Promise.reject(error);
  },
);

export default api;
