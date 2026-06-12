import { useState, useEffect, useRef } from "react";
import { Task } from "../store/taskStore";

const reminderTimers = new Map<number, ReturnType<typeof setTimeout>>();

export function requestPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) {
    return Promise.resolve("denied");
  }
  return Notification.requestPermission();
}

export function scheduleReminder(task: Task, minutesBefore: number): void {
  if (!task.due_datetime) return;

  const dueMs = new Date(task.due_datetime).getTime();
  const triggerMs = dueMs - minutesBefore * 60 * 1000;
  const delayMs = triggerMs - Date.now();

  if (delayMs <= 0) return;

  cancelReminder(task.id);

  const timer = setTimeout(() => {
    if (Notification.permission === "granted") {
      new Notification(`タスクのリマインダー: ${task.title}`, {
        body: `${minutesBefore}分後に締め切りです`,
        icon: "/icons/icon-192x192.png",
        tag: `task-reminder-${task.id}`,
      });
    }
    reminderTimers.delete(task.id);
  }, delayMs);

  reminderTimers.set(task.id, timer);
}

export function cancelReminder(taskId: number): void {
  const timer = reminderTimers.get(taskId);
  if (timer !== undefined) {
    clearTimeout(timer);
    reminderTimers.delete(taskId);
  }
}

export function useNotificationPermission(): NotificationPermission {
  const [permission, setPermission] = useState<NotificationPermission>(
    "Notification" in window ? Notification.permission : "denied"
  );

  useEffect(() => {
    if (!("Notification" in window)) return;
    setPermission(Notification.permission);
  }, []);

  return permission;
}

export function useNotifications() {
  const permission = useNotificationPermission();
  const [currentPermission, setCurrentPermission] = useState(permission);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const request = async (): Promise<NotificationPermission> => {
    const result = await requestPermission();
    if (isMounted.current) {
      setCurrentPermission(result);
    }
    return result;
  };

  return {
    permission: currentPermission,
    requestPermission: request,
    scheduleReminder,
    cancelReminder,
  };
}
