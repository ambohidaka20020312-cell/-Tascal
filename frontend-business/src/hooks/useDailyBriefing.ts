import { useEffect, useState } from "react";
import { aiApi } from "../utils/api";

interface BriefingData {
  task_count: number;
  total_estimated_minutes: number;
  message: string;
  top_task: { id: number; title: string; priority: string } | null;
}

export function useDailyBriefing() {
  const [briefing, setBriefing] = useState<BriefingData | null>(null);

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    const lastDate = localStorage.getItem("last_briefing_date");
    if (lastDate === today) return;

    aiApi
      .dailyBriefing()
      .then((res) => {
        const data: BriefingData = res.data.data;
        setBriefing(data);
        localStorage.setItem("last_briefing_date", today);

        if (Notification.permission === "granted") {
          new Notification("Tascal デイリーブリーフィング", {
            body: data.message,
            icon: "/icons/icon-192x192.png",
          });
        } else if (Notification.permission === "default") {
          Notification.requestPermission().then((perm) => {
            if (perm === "granted") {
              new Notification("Tascal デイリーブリーフィング", {
                body: data.message,
                icon: "/icons/icon-192x192.png",
              });
            }
          });
        }
      })
      .catch(() => {});
  }, []);

  return { briefing };
}
