import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSettingsStore } from "../../store/settingsStore";

const ACCENT_COLORS = [
  { key: "blue", hex: "#3b82f6" },
  { key: "purple", hex: "#8b5cf6" },
  { key: "green", hex: "#22c55e" },
  { key: "orange", hex: "#f97316" },
  { key: "red", hex: "#ef4444" },
  { key: "pink", hex: "#ec4899" },
] as const;

const THEME_SEQUENCE = ["light", "dark", "system"] as const;

function ThemeIcon({ theme }: { theme: string }) {
  if (theme === "dark") {
    return (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z" />
      </svg>
    );
  }
  if (theme === "system") {
    return (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    );
  }
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
    </svg>
  );
}

export default function QuickToggleBar() {
  const navigate = useNavigate();
  const theme = useSettingsStore((s) => s.theme);
  const accentColor = useSettingsStore((s) => s.accentColor);
  const pomodoroDuration = useSettingsStore((s) => s.pomodoroDuration);
  const pomodoroBreakDuration = useSettingsStore((s) => s.pomodoroBreakDuration);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const setAccentColor = useSettingsStore((s) => s.setAccentColor);
  const setPomodoroSettings = useSettingsStore((s) => s.setPomodoroSettings);

  const [openPopup, setOpenPopup] = useState<"accent" | "pomodoro" | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openPopup) return;
    function handleClick(e: MouseEvent) {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setOpenPopup(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [openPopup]);

  function cycleTheme() {
    const idx = THEME_SEQUENCE.indexOf(theme);
    setTheme(THEME_SEQUENCE[(idx + 1) % THEME_SEQUENCE.length]);
  }

  return (
    <div
      ref={barRef}
      className="fixed bottom-6 right-4 z-50 flex flex-col items-center gap-2"
    >
      {openPopup === "accent" && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-3 mb-1">
          <div className="grid grid-cols-3 gap-2">
            {ACCENT_COLORS.map(({ key, hex }) => (
              <button
                key={key}
                onClick={() => {
                  setAccentColor(key);
                  setOpenPopup(null);
                }}
                className="w-8 h-8 rounded-full transition-transform hover:scale-110 focus:outline-none"
                style={{
                  backgroundColor: hex,
                  boxShadow:
                    accentColor === key
                      ? `0 0 0 3px white, 0 0 0 5px ${hex}`
                      : undefined,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {openPopup === "pomodoro" && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-4 mb-1 w-56">
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs text-gray-600 dark:text-gray-300 mb-1">
                <span>作業時間</span>
                <span>{pomodoroDuration}分</span>
              </div>
              <input
                type="range"
                min={5}
                max={60}
                step={5}
                value={pomodoroDuration}
                onChange={(e) =>
                  setPomodoroSettings({ pomodoroDuration: Number(e.target.value) })
                }
                className="w-full accent-[var(--accent-color)]"
              />
            </div>
            <div>
              <div className="flex justify-between text-xs text-gray-600 dark:text-gray-300 mb-1">
                <span>休憩時間</span>
                <span>{pomodoroBreakDuration}分</span>
              </div>
              <input
                type="range"
                min={1}
                max={30}
                step={1}
                value={pomodoroBreakDuration}
                onChange={(e) =>
                  setPomodoroSettings({ pomodoroBreakDuration: Number(e.target.value) })
                }
                className="w-full accent-[var(--accent-color)]"
              />
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col items-center gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-lg px-2 py-2">
        <button
          onClick={cycleTheme}
          title={`テーマ: ${theme}`}
          className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <ThemeIcon theme={theme} />
        </button>

        <button
          onClick={() => setOpenPopup(openPopup === "accent" ? null : "accent")}
          title="アクセントカラー"
          className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <span className="w-5 h-5 rounded-full" style={{ backgroundColor: "var(--accent-color)" }} />
        </button>

        <button
          onClick={() => setOpenPopup(openPopup === "pomodoro" ? null : "pomodoro")}
          title="ポモドーロ設定"
          className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-lg"
        >
          🍅
        </button>

        <button
          onClick={() => navigate("/settings")}
          title="設定"
          className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
