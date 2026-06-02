/**
 * Tauri デスクトップ機能フック
 */

/**
 * Tauri環境かどうかを判定する
 */
export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI__" in window;
}

/**
 * Tauriネイティブ通知フック
 * Tauri以外の環境ではWeb Notification APIにフォールバック
 */
export function useTauriNotification() {
  const sendNotification = async (title: string, body: string): Promise<void> => {
    if (isTauri()) {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("show_notification", { title, body });
    } else {
      // Web Notification APIへのフォールバック
      if (!("Notification" in window)) {
        console.warn("このブラウザは通知をサポートしていません");
        return;
      }

      if (Notification.permission === "granted") {
        new Notification(title, { body });
      } else if (Notification.permission !== "denied") {
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
          new Notification(title, { body });
        }
      }
    }
  };

  return { sendNotification };
}

/**
 * 自動起動管理フック
 */
export function useAutostart() {
  const enable = async (): Promise<void> => {
    if (!isTauri()) {
      console.warn("自動起動はTauriデスクトップアプリでのみ利用できます");
      return;
    }
    const { enable: autostartEnable } = await import("@tauri-apps/plugin-autostart");
    await autostartEnable();
  };

  const disable = async (): Promise<void> => {
    if (!isTauri()) {
      console.warn("自動起動はTauriデスクトップアプリでのみ利用できます");
      return;
    }
    const { disable: autostartDisable } = await import("@tauri-apps/plugin-autostart");
    await autostartDisable();
  };

  const isEnabled = async (): Promise<boolean> => {
    if (!isTauri()) return false;
    const { isEnabled: autostartIsEnabled } = await import("@tauri-apps/plugin-autostart");
    return autostartIsEnabled();
  };

  return { enable, disable, isEnabled };
}
