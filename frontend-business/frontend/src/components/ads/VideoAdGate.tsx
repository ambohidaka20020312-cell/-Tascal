import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

interface VideoAdGateProps {
  onComplete: () => void;
  onClose: () => void;
}

export default function VideoAdGate({ onComplete, onClose }: VideoAdGateProps) {
  const [phase, setPhase] = useState<"notice" | "ad" | "done">("notice");
  const [countdown, setCountdown] = useState(15);

  useEffect(() => {
    const t = setTimeout(() => setPhase("ad"), 500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (phase !== "ad") return;
    if (countdown <= 0) { setPhase("done"); return; }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
      <div
        className="rounded-2xl p-6 max-w-sm w-full text-center"
        style={{ background: "var(--bg-primary)" }}
      >
        {phase === "notice" && (
          <>
            <div className="text-3xl mb-3">📺</div>
            <h3 className="font-bold text-lg mb-2" style={{ color: "var(--text-primary)" }}>
              今日の無料枠を使い切りました
            </h3>
            <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
              15秒の広告を視聴するとタスクを追加できます
            </p>
            <div className="text-xs animate-pulse" style={{ color: "var(--text-secondary)" }}>
              広告を準備中...
            </div>
          </>
        )}

        {phase === "ad" && (
          <>
            <div
              className="w-full rounded-xl mb-4 flex items-center justify-center relative overflow-hidden"
              style={{ aspectRatio: "16/9", background: "#111" }}
            >
              <div className="text-white text-center">
                <div className="text-4xl mb-2">📺</div>
                <div className="text-sm opacity-70">広告</div>
              </div>
              <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                {countdown}秒
              </div>
            </div>

            {countdown <= 10 && (
              <Link
                to="/app/plans"
                onClick={onClose}
                className="block text-xs mb-3"
                style={{ color: "var(--accent)" }}
              >
                Proプランなら広告なし・無制限 ¥980/月 →
              </Link>
            )}

            <button
              disabled={countdown > 0}
              onClick={onComplete}
              className="w-full py-3 rounded-xl font-semibold text-sm transition-all"
              style={{
                background: countdown > 0 ? "var(--bg-secondary)" : "var(--accent)",
                color: countdown > 0 ? "var(--text-secondary)" : "white",
                cursor: countdown > 0 ? "not-allowed" : "pointer",
              }}
            >
              {countdown > 0 ? `あと${countdown}秒` : "タスクを追加する ✓"}
            </button>
          </>
        )}

        {phase === "done" && (
          <>
            <div className="text-4xl mb-3">✅</div>
            <h3 className="font-bold mb-4" style={{ color: "var(--text-primary)" }}>
              視聴完了！
            </h3>
            <button
              onClick={onComplete}
              className="w-full py-3 rounded-xl font-semibold text-sm text-white"
              style={{ background: "var(--accent)" }}
            >
              タスクを追加する
            </button>
          </>
        )}

        <button
          onClick={onClose}
          className="mt-3 text-xs"
          style={{ color: "var(--text-secondary)" }}
        >
          キャンセル
        </button>
      </div>
    </div>
  );
}
