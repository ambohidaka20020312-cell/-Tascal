import axios, { InternalAxiosRequestConfig } from "axios";
import { offlineQueue } from "./offlineQueue";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api/v1",
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;

  const method = (config.method ?? "").toUpperCase();
  if (!navigator.onLine && ["POST", "PATCH", "DELETE"].includes(method)) {
    offlineQueue.add({
      method: method as "POST" | "PATCH" | "DELETE",
      url: config.url ?? "",
      data: config.data
        ? typeof config.data === "string"
          ? JSON.parse(config.data)
          : config.data
        : undefined,
    });
    config.adapter = () =>
      Promise.resolve({
        data: null,
        status: 202,
        statusText: "Queued",
        headers: {},
        config,
      });
  }

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
  stats: () => api.get("/tasks/stats"),
};

export const aiApi = {
  optimize: (date?: string) => api.get("/ai/optimize", { params: { date } }),
  replan: (overrun_task_id: number, actual_minutes_so_far: number) =>
    api.post("/ai/replan", { overrun_task_id, actual_minutes_so_far }),
  insights: () => api.get("/ai/insights"),
  dailyBriefing: () => api.get("/ai/daily-briefing"),
};

export const calendarApi = {
  getTasks: (start: string, end: string) =>
    api.get("/calendar/tasks", { params: { start, end } }),
};

export const templateApi = {
  list: () => api.get("/templates"),
  create: (data: object) => api.post("/templates", data),
  update: (id: number, data: object) => api.put(`/templates/${id}`, data),
  delete: (id: number) => api.delete(`/templates/${id}`),
  use: (id: number, scheduled_date?: string) =>
    api.post(`/templates/${id}/use`, { scheduled_date }),
};

export const billingApi = {
  createCheckout: (plan: string, success_url: string, cancel_url: string) =>
    api.post("/billing/checkout", { plan, success_url, cancel_url }),
  getPortal: (return_url: string) =>
    api.post("/billing/portal", { return_url }),
  getSubscription: () => api.get("/billing/subscription"),
};

export const skillApi = {
  getSkills: (orgId: number, userId: number) =>
    api.get(`/org/${orgId}/members/${userId}/skills`),
  addSkill: (orgId: number, userId: number, data: { skill_tag: string; level: number }) =>
    api.post(`/org/${orgId}/members/${userId}/skills`, data),
  updateSkill: (orgId: number, userId: number, skillId: number, level: number) =>
    api.put(`/org/${orgId}/members/${userId}/skills/${skillId}`, { level }),
  deleteSkill: (orgId: number, userId: number, skillId: number) =>
    api.delete(`/org/${orgId}/members/${userId}/skills/${skillId}`),
  delegateTask: (orgId: number, taskId: number, targetType: string, targetId: number) =>
    api.post(`/org/${orgId}/tasks/${taskId}/delegate`, { target_type: targetType, target_id: targetId }),
  getReceivedTasks: (orgId: number) =>
    api.get(`/org/${orgId}/tasks/received`),
};

export default api;
