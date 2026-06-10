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
    if (error.response?.status === 403 && error.response?.data?.error?.code === "UPGRADE_REQUIRED") {
      window.dispatchEvent(new CustomEvent("upgrade-required", { detail: error.response.data.error }));
    }
    return Promise.reject(error);
  }
);

export const taskApi = {
  list: (date?: string, category_id?: number | null) =>
    api.get("/tasks", { params: { date, ...(category_id != null ? { category_id } : {}) } }),
  create: (data: object) => api.post("/tasks", data),
  update: (id: number, data: object) => api.patch(`/tasks/${id}`, data),
  delete: (id: number) => api.delete(`/tasks/${id}`),
  complete: (id: number, actual_minutes: number) =>
    api.post(`/tasks/${id}/complete`, { actual_minutes }),
  stats: () => api.get("/tasks/stats"),
  reorder: (order: number[]) => api.patch("/tasks/reorder", { order }),
  bulkComplete: (ids: number[]) => api.post("/tasks/bulk-complete", { ids }),
  bulkDelete: (ids: number[]) => api.delete("/tasks/bulk", { data: { ids } }),
  export: (format: "csv" | "json", start?: string, end?: string) =>
    api.get("/tasks/export", { params: { format, start, end }, responseType: "blob" }),
  getNotes: (taskId: number) => api.get(`/tasks/${taskId}/notes`),
  addNote: (taskId: number, content: string) => api.post(`/tasks/${taskId}/notes`, { content }),
  deleteNote: (taskId: number, noteId: number) => api.delete(`/tasks/${taskId}/notes/${noteId}`),
  getSubtasks: (id: number) => api.get(`/tasks/${id}/subtasks`),
  overdue: () => api.get("/tasks/overdue"),
};

export const aiApi = {
  optimize: (date?: string) => api.get("/ai/optimize", { params: { date } }),
  replan: (overrun_task_id: number, actual_minutes_so_far: number) =>
    api.post("/ai/replan", { overrun_task_id, actual_minutes_so_far }),
  insights: () => api.get("/ai/insights"),
  dailyBriefing: () => api.get("/ai/daily-briefing"),
  suggestions: () => api.get("/ai/suggestions"),
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

export const authApi = {
  logout: () => api.post("/auth/logout"),
  updateProfile: (data: { name?: string; onboarding_completed?: boolean }) =>
    api.patch("/auth/profile", data),
  getProfile: () => api.get("/auth/profile"),
  unsubscribeDigest: () => api.post("/account/unsubscribe-digest"),
  resubscribeDigest: () => api.post("/account/resubscribe-digest"),
  startTrial: () => api.post("/account/start-trial"),
  getMe: () => api.get("/auth/me"),
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

export const orgApi = {
  create: (name: string) => api.post("/org", { name }),
  get: () => api.get("/org"),
  invite: (orgId: number, email: string) => api.post(`/org/${orgId}/invite`, { email }),
  removeMember: (orgId: number, userId: number) => api.delete(`/org/${orgId}/members/${userId}`),
  getMembers: (orgId: number) => api.get(`/org/${orgId}/members`),
  updateMemberRole: (orgId: number, userId: number, role: "admin" | "member") =>
    api.patch(`/org/${orgId}/members/${userId}`, { role }),
  acceptInvite: (token: string) => api.get(`/org/accept-invite?token=${token}`),
};

export const categoryApi = {
  list: () => api.get("/categories"),
  create: (data: { name: string; color?: string }) => api.post("/categories", data),
  update: (id: number, data: { name?: string; color?: string }) => api.put(`/categories/${id}`, data),
  delete: (id: number) => api.delete(`/categories/${id}`),
};

export const chatApi = {
  getChannels: () => api.get("/channels"),
  getMessages: (channelId: number) => api.get(`/channels/${channelId}/messages`),
  sendMessage: (channelId: number, body: string) =>
    api.post(`/channels/${channelId}/messages`, { body }),
  messageToTask: (
    channelId: number,
    messageId: number,
    data: { title: string; assignee_id?: number; due_date?: string }
  ) => api.post(`/channels/${channelId}/messages/${messageId}/to-task`, data),
  createChannel: (name: string, channel_type: "group" | "dm", department_id?: number) =>
    api.post("/channels", { name, channel_type, department_id }),
  getDepartments: (orgId: number) => api.get(`/org/${orgId}/departments`),
  createDepartment: (orgId: number, name: string) =>
    api.post(`/org/${orgId}/departments`, { name }),
  deleteDepartment: (orgId: number, deptId: number) =>
    api.delete(`/org/${orgId}/departments/${deptId}`),
  assignMemberToDepartment: (orgId: number, deptId: number, userId: number) =>
    api.post(`/org/${orgId}/departments/${deptId}/members`, { user_id: userId }),
  uploadToChannel: async (channelId: number, formData: FormData) => {
    const token = localStorage.getItem("access_token");
    const baseURL = import.meta.env.VITE_API_BASE_URL || "/api/v1";
    const response = await fetch(`${baseURL}/channels/${channelId}/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token ?? ""}` },
      body: formData,
    });
    return response.json();
  },
};

export const adminApi = {
  getStats: () => api.get("/admin/stats"),
  getUsers: (params?: object) => api.get("/admin/users", { params }),
  getUser: (id: number) => api.get(`/admin/users/${id}`),
  updateUser: (id: number, data: object) => api.patch(`/admin/users/${id}`, data),
};

export default api;
