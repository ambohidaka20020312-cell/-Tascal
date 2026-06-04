import { useState, useEffect } from "react";
import { authApi } from "../../utils/api";
import PushNotificationToggle from "./PushNotificationToggle";

function Toggle({
  checked,
  onChange,
  loading,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  loading?: boolean;
}) {
  return (
    <button
      onClick={() => !loading && onChange(!checked)}
      disabled={loading}
      aria-checked={checked}
      role="switch"
      className={[
        "relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50",
        checked ? "bg-[var(--text-primary)]" : "bg-[var(--border)]",
      ].join(" ")}
    >
      <span
        className={[
          "inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-5" : "translate-x-1",
        ].join(" ")}
      />
    </button>
  );
}

export default function NotificationSettings() {
  const [digestSubscribed, setDigestSubscribed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    authApi
      .getProfile()
      .then((res) => {
        const data = res.data?.data;
        setDigestSubscribed(!data?.digest_unsubscribed);
      })
      .catch(() => {
        setFetchError(true);
      });
  }, []);

  async function handleDigestToggle(nextValue: boolean) {
    setLoading(true);
    try {
      if (nextValue) {
        await authApi.resubscribeDigest();
      } else {
        await authApi.unsubscribeDigest();
      }
      setDigestSubscribed(nextValue);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-[var(--bg-secondary)] rounded-xl p-5 mb-4 border border-[var(--border)]">
      <h2 className="text-xs font-semibold tracking-widest uppercase text-[var(--text-subtle)] mb-3">
        通知設定
      </h2>

      <div className="flex items-center justify-between py-2">
        <div>
          <span className="text-sm text-[var(--text-primary)] tracking-wide">
            週次ダイジェストメール
          </span>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            毎週の進捗サマリーをメールでお届けします
          </p>
        </div>
        {fetchError ? (
          <span className="text-xs text-[var(--text-muted)]">取得失敗</span>
        ) : digestSubscribed === null ? (
          <span className="text-xs text-[var(--text-muted)]">読み込み中…</span>
        ) : (
          <Toggle
            checked={digestSubscribed}
            onChange={handleDigestToggle}
            loading={loading}
          />
        )}
      </div>

      <div className="flex items-center justify-between py-2">
        <div>
          <span className="text-sm text-[var(--text-primary)] tracking-wide">
            プッシュ通知
          </span>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            ブラウザのプッシュ通知を有効にします
          </p>
        </div>
        <PushNotificationToggle />
      </div>
    </div>
  );
}
