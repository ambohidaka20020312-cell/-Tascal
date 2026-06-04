import { useEffect, useRef, useState } from "react";
import { taskApi } from "../../utils/api";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ExportModal({ isOpen, onClose }: ExportModalProps) {
  const [format, setFormat] = useState<"csv" | "json">("csv");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [loading, setLoading] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleExport = async () => {
    setLoading(true);
    try {
      const res = await taskApi.export(format, start || undefined, end || undefined);
      const blob = res.data as Blob;
      const url = URL.createObjectURL(blob);
      const today = new Date().toISOString().split("T")[0];
      const a = document.createElement("a");
      a.href = url;
      a.download = `tascal_tasks_${today}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      onClose();
    } catch {
      // silently ignore — user can retry
    } finally {
      setLoading(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === backdropRef.current) onClose();
  };

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--bg-primary)] bg-opacity-70"
      style={{ backdropFilter: "blur(2px)" }}
    >
      <div className="w-full max-w-sm mx-4 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-[0.15em] uppercase text-[var(--text-primary)]">
            エクスポート
          </h2>
          <button
            onClick={onClose}
            aria-label="閉じる"
            className="text-[var(--text-subtle)] hover:text-[var(--text-muted)] transition-colors text-lg leading-none"
          >
            ×
          </button>
        </div>

        {/* Format selector */}
        <div>
          <p className="text-[10px] tracking-[0.2em] uppercase text-[var(--text-subtle)] mb-2">
            フォーマット
          </p>
          <div className="flex gap-2">
            {(["csv", "json"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                className={[
                  "flex-1 py-2 text-xs tracking-[0.15em] uppercase border rounded-lg transition-colors",
                  format === f
                    ? "bg-[var(--text-primary)] text-[var(--bg-primary)] border-[var(--text-primary)]"
                    : "border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--text-muted)]",
                ].join(" ")}
              >
                {f.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Date range */}
        <div>
          <p className="text-[10px] tracking-[0.2em] uppercase text-[var(--text-subtle)] mb-2">
            期間（任意）
          </p>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="flex-1 border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-muted)]"
            />
            <span className="text-[var(--text-subtle)] text-xs">〜</span>
            <input
              type="date"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="flex-1 border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-muted)]"
            />
          </div>
          <p className="text-[10px] text-[var(--text-subtle)] mt-1.5">
            未指定の場合はすべてのタスクを出力
          </p>
        </div>

        {/* Export button */}
        <button
          onClick={handleExport}
          disabled={loading}
          className="w-full py-2.5 text-sm tracking-[0.15em] uppercase border border-[var(--text-primary)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--text-primary)] hover:text-[var(--bg-primary)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? "…" : "エクスポート"}
        </button>
      </div>
    </div>
  );
}
