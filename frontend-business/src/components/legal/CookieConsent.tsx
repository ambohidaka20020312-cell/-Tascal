import { useState } from "react";
import { useCookieConsent, CookieConsentData } from "../../hooks/useCookieConsent";

export default function CookieConsent() {
  const { hasConsented, consent, acceptAll, acceptEssential, updateConsent } =
    useCookieConsent();
  const [showModal, setShowModal] = useState(false);
  const [draft, setDraft] = useState<Pick<CookieConsentData, "analytics" | "advertising">>({
    analytics: false,
    advertising: false,
  });

  if (hasConsented) return null;

  const openModal = () => {
    setDraft({ analytics: consent.analytics, advertising: consent.advertising });
    setShowModal(true);
  };

  const handleSaveSettings = () => {
    updateConsent(draft);
    setShowModal(false);
  };

  return (
    <>
      {/* Banner */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--bg-secondary)] border-t border-[var(--border)] p-4">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <p className="flex-1 text-sm text-[var(--text-primary)]">
            このサービスではCookieを使用しています。詳細は{" "}
            <a
              href="/cookie-policy"
              className="text-[var(--accent)] underline hover:opacity-80"
            >
              Cookie ポリシー
            </a>{" "}
            をご確認ください。
          </p>
          <div className="flex flex-wrap gap-2 shrink-0">
            <button
              onClick={openModal}
              className="px-3 py-1.5 text-xs font-medium border border-[var(--border)] rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] transition-colors"
            >
              設定する
            </button>
            <button
              onClick={acceptEssential}
              className="px-3 py-1.5 text-xs font-medium border border-[var(--border)] rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] transition-colors"
            >
              必須のみ
            </button>
            <button
              onClick={acceptAll}
              className="px-3 py-1.5 text-xs font-medium bg-[var(--accent)] text-white dark:text-[#0f0f0f] rounded-lg hover:opacity-90 transition-opacity"
            >
              すべて承認
            </button>
          </div>
        </div>
      </div>

      {/* Detail modal */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 p-4">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl w-full max-w-md p-6 space-y-5 shadow-xl">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              Cookie設定
            </h2>

            {/* Essential */}
            <div className="flex items-start gap-3">
              <div className="mt-0.5 w-10 h-5 rounded-full bg-[var(--accent)] opacity-50 shrink-0" />
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  必須Cookie（常に有効）
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  サービスの基本機能に必要なCookieです。無効にすることはできません。
                </p>
              </div>
            </div>

            {/* Analytics */}
            <div className="flex items-start gap-3">
              <button
                role="switch"
                aria-checked={draft.analytics}
                onClick={() => setDraft((d) => ({ ...d, analytics: !d.analytics }))}
                className={`mt-0.5 shrink-0 relative w-10 h-5 rounded-full transition-colors ${
                  draft.analytics ? "bg-[var(--accent)]" : "bg-[var(--bg-tertiary)]"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    draft.analytics ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  アナリティクスCookie
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  サービス改善のための利用状況データを収集します。
                </p>
              </div>
            </div>

            {/* Advertising */}
            <div className="flex items-start gap-3">
              <button
                role="switch"
                aria-checked={draft.advertising}
                onClick={() => setDraft((d) => ({ ...d, advertising: !d.advertising }))}
                className={`mt-0.5 shrink-0 relative w-10 h-5 rounded-full transition-colors ${
                  draft.advertising ? "bg-[var(--accent)]" : "bg-[var(--bg-tertiary)]"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    draft.advertising ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  広告Cookie
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  パーソナライズされた広告の表示に使用されます。
                </p>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-3 py-2 text-sm border border-[var(--border)] rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleSaveSettings}
                className="flex-1 px-3 py-2 text-sm bg-[var(--accent)] text-white dark:text-[#0f0f0f] rounded-lg hover:opacity-90 transition-opacity font-medium"
              >
                保存する
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
