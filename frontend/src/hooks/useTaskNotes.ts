import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { taskApi } from "../utils/api";

export interface TaskNote {
  id: number;
  task_id: number;
  content: string;
  created_at: string;
}

export function useTaskNotes(taskId: number) {
  return useQuery<TaskNote[]>({
    queryKey: ["task-notes", taskId],
    queryFn: async () => {
      const res = await taskApi.getNotes(taskId);
      return res.data.data as TaskNote[];
    },
    enabled: taskId > 0,
  });
}

export function useAddNote(taskId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (content: string) => taskApi.addNote(taskId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-notes", taskId] });
    },
  });
}

export function useDeleteNote(taskId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (noteId: number) => taskApi.deleteNote(taskId, noteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-notes", taskId] });
    },
  });
}
