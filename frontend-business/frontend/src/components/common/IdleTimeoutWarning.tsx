import { useIdleTimeout } from "../../hooks/useIdleTimeout";

export default function IdleTimeoutWarning() {
  const { showWarning, secondsLeft, stayActive, doLogout } = useIdleTimeout();

  if (!showWarning) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center">
        <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
          セッションの期限切れ
        </h2>
        <p className="text-sm text-[var(--text-muted)] mb-1">
          しばらく操作がありませんでした。
        </p>
        <p className="text-sm text-[var(--text-muted)] mb-6">
          <span className="font-semibold text-amber-500 text-base">{secondsLeft}</span> 秒後に自動ログアウトします。
        </p>
        <div className="flex gap-3">
          <button
            onClick={doLogout}
            className="flex-1 h-10 border border-[var(--border)] text-[var(--text-muted)] text-sm rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
          >
            ログアウト
          </button>
          <button
            onClick={stayActive}
            className="flex-1 h-10 bg-[var(--text-primary)] text-[var(--bg-primary)] text-sm font-semibold rounded-lg hover:opacity-80 transition-opacity"
          >
            続ける
          </button>
        </div>
      </div>
    </div>
  );
}
