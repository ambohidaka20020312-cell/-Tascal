import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api/v1",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      const refresh = localStorage.getItem("refresh_token");
      if (refresh) {
        try {
          const { data } = await axios.post("/api/v1/auth/refresh", null, {
            headers: { Authorization: `Bearer ${refresh}` },
          });
          localStorage.setItem("access_token", data.data.access_token);
          error.config.headers.Authorization = `Bearer ${data.data.access_token}`;
          return api.request(error.config);
        } catch {
          localStorage.clear();
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

export const taskApi = {
  list: (date?: string) => api.get("/tasks", { params: { date } }),
  create: (data: object) => api.post("/tasks", data),
  update: (id: number, data: object) => api.patch(`/tasks/${id}`, data),
  delete: (id: number) => api.delete(`/tasks/${id}`),
  complete: (id: number, actual_minutes: number) =>
    api.post(`/tasks/${id}/complete`, { actual_minutes }),
};

export const aiApi = {
  optimize: (date?: string) => api.get("/ai/optimize", { params: { date } }),
  replan: (overrun_task_id: number, actual_minutes_so_far: number) =>
    api.post("/ai/replan", { overrun_task_id, actual_minutes_so_far }),
  insights: () => api.get("/ai/insights"),
};

export const calendarApi = {
  getTasks: (start: string, end: string) =>
    api.get("/calendar/tasks", { params: { start, end } }),
};

export const billingApi = {
  createCheckout: (plan: string, success_url: string, cancel_url: string) =>
    api.post("/billing/checkout", { plan, success_url, cancel_url }),
  getPortal: (return_url: string) =>
    api.post("/billing/portal", { return_url }),
  getSubscription: () => api.get("/billing/subscription"),
};

export default api;
