import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { taskApi } from "../utils/api";

export default function ShareTargetPage() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [status, setStatus] = useState<"processing" | "done" | "error">("processing");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const title = params.get("title") || "";
    const text = params.get("text") || "";
    const url = params.get("url") || "";

    // タスクタイトルを組み立て（title優先、なければtext、それもなければURL）
    const taskTitle = title || text || url || "共有されたコンテンツ";
    // 説明欄にURLや本文を入れる
    const notes = [text, url].filter(Boolean).join("\n").trim();

    if (!isAuthenticated()) {
      // 未ログインなら、ログイン後に戻ってこれるようパラメータを保持してloginへ
      const returnUrl = `/share-target?title=${encodeURIComponent(title)}&text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
      navigate(`/login?next=${encodeURIComponent(returnUrl)}`);
      return;
    }

    const today = new Date().toISOString().split("T")[0];

    taskApi
      .create({
        title: taskTitle.slice(0, 100),
        notes: notes || undefined,
        scheduled_date: today,
        priority: "medium",
      })
      .then(() => {
        setStatus("done");
        setTimeout(() => navigate("/app/tasks"), 1500);
      })
      .catch(() => {
        setStatus("error");
        setTimeout(() => navigate("/app/tasks"), 2000);
      });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
      <div className="text-center px-6">
        {status === "processing" && (
          <>
            <div className="w-10 h-10 border-2 border-[var(--border)] border-t-[var(--text-primary)] rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[var(--text-secondary)] text-sm">タスクを追加中...</p>
          </>
        )}
        {status === "done" && (
          <>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-[var(--text-primary)] font-medium mb-1">タスクを追加しました</p>
            <p className="text-[var(--text-secondary)] text-sm">タスク一覧へ移動します...</p>
          </>
        )}
        {status === "error" && (
          <>
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-[var(--text-primary)] font-medium mb-1">追加に失敗しました</p>
            <p className="text-[var(--text-secondary)] text-sm">タスク一覧へ移動します...</p>
          </>
        )}
      </div>
    </div>
  );
}
