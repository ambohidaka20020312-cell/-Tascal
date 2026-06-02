import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { taskApi } from "../utils/api";
import { useTaskStore, Task } from "../store/taskStore";

export function useTasksQuery(date?: string) {
  const setTasks = useTaskStore((s) => s.setTasks);

  return useQuery({
    queryKey: ["tasks", date],
    queryFn: async () => {
      const res = await taskApi.list(date);
      const tasks: Task[] = res.data.data ?? res.data;
      setTasks(tasks);
      return tasks;
    },
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  const addTask = useTaskStore((s) => s.addTask);

  return useMutation({
    mutationFn: (data: Partial<Task>) => taskApi.create(data),
    onSuccess: (res) => {
      const task: Task = res.data.data ?? res.data;
      addTask(task);
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useCompleteTask() {
  const queryClient = useQueryClient();
  const updateTask = useTaskStore((s) => s.updateTask);

  return useMutation({
    mutationFn: ({
      id,
      actual_minutes,
    }: {
      id: number;
      actual_minutes: number;
    }) => taskApi.complete(id, actual_minutes),
    onSuccess: (res, variables) => {
      const updated: Task = res.data.data ?? res.data;
      updateTask(variables.id, updated);
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  const removeTask = useTaskStore((s) => s.removeTask);

  return useMutation({
    mutationFn: (id: number) => taskApi.delete(id),
    onSuccess: (_res, id) => {
      removeTask(id);
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}
