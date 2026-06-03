import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { templateApi } from "../utils/api";

export interface TaskTemplate {
  id: number;
  user_id: number;
  name: string;
  title: string;
  description: string;
  priority: string;
  estimated_minutes: number | null;
  category: string | null;
  tags: string | null;
  use_count: number;
  created_at: string;
  updated_at: string;
}

export function useTemplates() {
  return useQuery<TaskTemplate[]>({
    queryKey: ["templates"],
    queryFn: async () => {
      const res = await templateApi.list();
      return res.data.data ?? res.data;
    },
  });
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<TaskTemplate>) => templateApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
    },
  });
}

export function useUseTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, scheduled_date }: { id: number; scheduled_date?: string }) =>
      templateApi.use(id, scheduled_date),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["templates"] });
    },
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => templateApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
    },
  });
}
