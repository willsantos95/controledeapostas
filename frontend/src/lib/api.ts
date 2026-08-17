import axios from "axios";

export const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:4000",
  withCredentials: true,
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshing: Promise<string> | null = null;

API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/refresh") &&
      !originalRequest.url?.includes("/auth/login")
    ) {
      originalRequest._retry = true;
      try {
        if (!refreshing) {
          refreshing = API.get("/auth/refresh").then((res) => {
            const token = res.data.access_token as string;
            localStorage.setItem("access_token", token);
            return token;
          });
        }
        const token = await refreshing;
        refreshing = null;
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return API.request(originalRequest);
      } catch (refreshError) {
        refreshing = null;
        localStorage.removeItem("access_token");
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
