import { useState, useEffect } from "react";
import { useNotifications } from "../../hooks/useNotifications";

const STORAGE_KEY = "tascal_notification_prompt_dismissed";

export default function NotificationPrompt() {
  const { permission, requestPermission } = useNotifications();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!("Notification" in window)) return;
    if (permission !== "default") return;
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed) {
      setVisible(true);
    }
  }, [permission]);

  const handleAllow = async () => {
    await requestPermission();
    setVisible(false);
  };

  const handleLater = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-indigo-600 text-white shadow-lg">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <svg
            className="w-5 h-5 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
          <p className="text-sm font-medium">
            タスクのリマインダー通知を有効にしますか？締め切り前にお知らせします。
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleAllow}
            className="bg-white text-indigo-700 text-sm font-semibold px-4 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
          >
            通知を許可する
          </button>
          <button
            onClick={handleLater}
            className="text-indigo-200 text-sm px-3 py-1.5 rounded-lg hover:text-white transition-colors"
          >
            後で
          </button>
        </div>
      </div>
    </div>
  );
}
