import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import {
  LocalNotifications,
  ScheduleOptions,
} from '@capacitor/local-notifications';

export interface Task {
  id: number;
  title: string;
  deadline?: string; // ISO date string
}

/** Whether the app is running inside a native Capacitor container */
export const isNative = Capacitor.isNativePlatform();

/** Current platform: 'ios' | 'android' | 'web' */
export const platform = Capacitor.getPlatform() as 'ios' | 'android' | 'web';

// ── Haptic Feedback ──────────────────────────────────────────────────────────

/**
 * Returns helper functions for haptic feedback.
 * Falls back silently on web.
 */
export function useHapticFeedback() {
  const impact = async (style: ImpactStyle = ImpactStyle.Medium) => {
    if (!isNative) return;
    try {
      await Haptics.impact({ style });
    } catch {
      // Ignore on unsupported devices
    }
  };

  /** Light tap — use for general interactions */
  const lightTap = () => impact(ImpactStyle.Light);

  /** Medium impact — use for confirmations */
  const mediumImpact = () => impact(ImpactStyle.Medium);

  /** Heavy impact — use for task completion */
  const taskCompleted = () => impact(ImpactStyle.Heavy);

  return { lightTap, mediumImpact, taskCompleted };
}

// ── Local Notifications ──────────────────────────────────────────────────────

/**
 * Returns helpers to schedule and cancel local task reminder notifications.
 */
export function useLocalNotification() {
  /**
   * Schedule a reminder notification 30 minutes before the task deadline.
   * No-ops if there is no deadline or if running on web.
   */
  const scheduleTaskReminder = async (task: Task) => {
    if (!isNative || !task.deadline) return;

    try {
      const deadlineMs = new Date(task.deadline).getTime();
      const reminderMs = deadlineMs - 30 * 60 * 1000; // 30 min before

      if (reminderMs <= Date.now()) return; // deadline has already passed

      const options: ScheduleOptions = {
        notifications: [
          {
            id: task.id,
            title: 'タスクのリマインダー',
            body: `「${task.title}」の締切まであと30分です`,
            schedule: { at: new Date(reminderMs) },
            sound: undefined,
            actionTypeId: '',
            extra: { taskId: task.id },
          },
        ],
      };

      await LocalNotifications.schedule(options);
    } catch {
      // Ignore scheduling errors
    }
  };

  /** Cancel a previously scheduled reminder for the given task ID. */
  const cancelNotification = async (taskId: number) => {
    if (!isNative) return;
    try {
      await LocalNotifications.cancel({ notifications: [{ id: taskId }] });
    } catch {
      // Ignore cancellation errors
    }
  };

  return { scheduleTaskReminder, cancelNotification };
}
