import React from "react";
import { useSettingsStore } from "../store/settingsStore";

const ACCENT_COLORS = [
  { key: "blue", hex: "#3b82f6", label: "ブルー" },
  { key: "purple", hex: "#8b5cf6", label: "パープル" },
  { key: "green", hex: "#22c55e", label: "グリーン" },
  { key: "orange", hex: "#f97316", label: "オレンジ" },
  { key: "red", hex: "#ef4444", label: "レッド" },
  { key: "pink", hex: "#ec4899", label: "ピンク" },
] as const;

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">
      {children}
    </h2>
  );
}

function Section({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 mb-4">
      {children}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
      <div>{children}</div>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={[
        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none",
        checked ? "bg-[var(--accent-color)]" : "bg-gray-300 dark:bg-gray-600",
      ].join(" ")}
    >
      <span
        className={[
          "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-6" : "translate-x-1",
        ].join(" ")}
      />
    </button>
  );
}

export default function SettingsPage() {
  const s = useSettingsStore();

  return (
    <div className="max-w-2xl mx-auto py-6 px-2">
      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">設定</h1>

      <Section>
        <SectionTitle>外観</SectionTitle>

        <Row label="テーマ">
          <div className="flex gap-2">
            {(["light", "dark", "system"] as const).map((t) => (
              <button
                key={t}
                onClick={() => s.setTheme(t)}
                className={[
                  "px-3 py-1 rounded-lg text-xs font-medium border transition-colors",
                  s.theme === t
                    ? "bg-[var(--accent-color)] text-white border-transparent"
                    : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600",
                ].join(" ")}
              >
                {t === "light" ? "ライト" : t === "dark" ? "ダーク" : "システム"}
              </button>
            ))}
          </div>
        </Row>

        <Row label="アクセントカラー">
          <div className="flex gap-2">
            {ACCENT_COLORS.map(({ key, hex }) => (
              <button
                key={key}
                onClick={() => s.setAccentColor(key)}
                title={key}
                className="w-7 h-7 rounded-full transition-transform hover:scale-110 focus:outline-none"
                style={{
                  backgroundColor: hex,
                  boxShadow:
                    s.accentColor === key
                      ? `0 0 0 2px white, 0 0 0 4px ${hex}`
                      : undefined,
                }}
              />
            ))}
          </div>
        </Row>

        <Row label="タスク表示密度">
          <div className="flex gap-2">
            {(["compact", "normal", "comfortable"] as const).map((d) => (
              <button
                key={d}
                onClick={() => s.setDisplaySettings({ taskDensity: d })}
                className={[
                  "px-3 py-1 rounded-lg text-xs font-medium border transition-colors",
                  s.taskDensity === d
                    ? "bg-[var(--accent-color)] text-white border-transparent"
                    : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600",
                ].join(" ")}
              >
                {d === "compact" ? "コンパクト" : d === "normal" ? "標準" : "広め"}
              </button>
            ))}
          </div>
        </Row>
      </Section>

      <Section>
        <SectionTitle>ポモドーロ</SectionTitle>

        <Row label="作業時間（分）">
          <input
            type="number"
            min={5}
            max={60}
            value={s.pomodoroDuration}
            onChange={(e) => s.setPomodoroSettings({ pomodoroDuration: Number(e.target.value) })}
            className="w-20 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]"
          />
        </Row>

        <Row label="休憩時間（分）">
          <input
            type="number"
            min={1}
            max={30}
            value={s.pomodoroBreakDuration}
            onChange={(e) => s.setPomodoroSettings({ pomodoroBreakDuration: Number(e.target.value) })}
            className="w-20 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]"
          />
        </Row>

        <Row label="長休憩時間（分）">
          <input
            type="number"
            min={5}
            max={60}
            value={s.pomodoroLongBreak}
            onChange={(e) => s.setPomodoroSettings({ pomodoroLongBreak: Number(e.target.value) })}
            className="w-20 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]"
          />
        </Row>

        <Row label="長休憩サイクル数">
          <input
            type="number"
            min={1}
            max={10}
            value={s.pomodoroLongBreakAfter}
            onChange={(e) => s.setPomodoroSettings({ pomodoroLongBreakAfter: Number(e.target.value) })}
            className="w-20 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]"
          />
        </Row>

        <Row label="ビープ音">
          <Toggle
            checked={s.pomodoroSound}
            onChange={(v) => s.setPomodoroSettings({ pomodoroSound: v })}
          />
        </Row>
      </Section>

      <Section>
        <SectionTitle>通知</SectionTitle>

        <Row label="デイリーブリーフィング">
          <Toggle
            checked={s.dailyBriefingEnabled}
            onChange={(v) => s.setNotificationSettings({ dailyBriefingEnabled: v })}
          />
        </Row>

        <Row label="通知時刻">
          <input
            type="time"
            value={s.briefingTime}
            onChange={(e) => s.setNotificationSettings({ briefingTime: e.target.value })}
            disabled={!s.dailyBriefingEnabled}
            className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)] disabled:opacity-50"
          />
        </Row>
      </Section>

      <Section>
        <SectionTitle>表示</SectionTitle>

        <Row label="デフォルトビュー">
          <div className="flex gap-2">
            {(["today", "week", "calendar"] as const).map((v) => (
              <button
                key={v}
                onClick={() => s.setDisplaySettings({ defaultView: v })}
                className={[
                  "px-3 py-1 rounded-lg text-xs font-medium border transition-colors",
                  s.defaultView === v
                    ? "bg-[var(--accent-color)] text-white border-transparent"
                    : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600",
                ].join(" ")}
              >
                {v === "today" ? "今日" : v === "week" ? "週" : "カレンダー"}
              </button>
            ))}
          </div>
        </Row>

        <Row label="推定時間を表示">
          <Toggle
            checked={s.showEstimatedTime}
            onChange={(v) => s.setDisplaySettings({ showEstimatedTime: v })}
          />
        </Row>
      </Section>
    </div>
  );
}
