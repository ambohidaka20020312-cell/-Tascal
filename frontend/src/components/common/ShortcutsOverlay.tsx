import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

export default function ShortcutsOverlay() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const SHORTCUTS = [
    { key: "n", desc: t("shortcuts.new_task") },
    { key: "?", desc: t("shortcuts.show_shortcuts") },
    { key: "Esc", desc: t("shortcuts.escape") },
    { key: "f", desc: t("shortcuts.filter_focus") },
    { key: "1", desc: t("shortcuts.filter_all") },
    { key: "2", desc: t("shortcuts.filter_pending") },
    { key: "3", desc: t("shortcuts.filter_active") },
    { key: "4", desc: t("shortcuts.filter_done") },
  ];

  useEffect(() => {
    const toggle = () => setOpen((v) => !v);
    const close = () => setOpen(false);

    window.addEventListener("toggle-shortcuts", toggle);
    window.addEventListener("close-overlays", close);
    return () => {
      window.removeEventListener("toggle-shortcuts", toggle);
      window.removeEventListener("close-overlays", close);
    };
  }, []);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        className="relative w-full max-w-sm mx-4 bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xs tracking-[0.2em] uppercase text-[var(--text-subtle)] font-medium">
            {t("shortcuts.title")}
          </h2>
          <button
            onClick={() => setOpen(false)}
            className="text-[var(--text-subtle)] hover:text-[var(--text-muted)] transition-colors text-lg leading-none"
            aria-label={t("shortcuts.close")}
          >
            ×
          </button>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
          {SHORTCUTS.map(({ key, desc }) => (
            <div key={key} className="flex items-center gap-2">
              <kbd className="px-1.5 py-0.5 text-[10px] border border-[var(--border)] rounded bg-[var(--bg-secondary)] text-[var(--text-muted)] font-mono shrink-0">
                {key}
              </kbd>
              <span className="text-[11px] text-[var(--text-muted)] leading-tight">{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
