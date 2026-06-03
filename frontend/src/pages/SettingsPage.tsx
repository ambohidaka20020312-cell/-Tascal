import React from "react";
import { useSettingsStore } from "../store/settingsStore";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold tracking-widest uppercase text-[var(--text-subtle)] mb-3">
      {children}
    </h2>
  );
}

function Section({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-[var(--bg-secondary)] rounded-xl p-5 mb-4 border border-[var(--border)]">
      {children}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-[var(--text-primary)] tracking-wide">{label}</span>
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
        checked ? "bg-[var(--accent)]" : "bg-[var(--border)]",
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
      <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-wider mb-6">設定</h1>

      <Section>
        <SectionTitle>外観</SectionTitle>

        <Row label="テーマ">
          <div className="flex gap-2">
            {(["light", "dark", "system"] as const).map((t) => (
              <button
                key={t}
                onClick={() => s.setTheme(t)}
                className={[
                  "px-3 py-1 rounded-lg text-xs font-medium border transition-colors tracking-wide",
                  s.theme === t
                    ? "bg-[var(--accent)] text-white dark:text-[#0f0f0f] border-transparent"
                    : "bg-transparent text-[var(--text-muted)] border-[var(--border)] hover:border-[var(--text-subtle)] hover:text-[var(--text-primary)]",
                ].join(" ")}
              >
                {t === "light" ? "ライト" : t === "dark" ? "ダーク" : "システム"}
              </button>
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
                  "px-3 py-1 rounded-lg text-xs font-medium border transition-colors tracking-wide",
                  s.taskDensity === d
                    ? "bg-[var(--accent)] text-white dark:text-[#0f0f0f] border-transparent"
                    : "bg-transparent text-[var(--text-muted)] border-[var(--border)] hover:border-[var(--text-subtle)] hover:text-[var(--text-primary)]",
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
            className="w-20 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-primary)] px-2 py-1 text-sm text-right focus:outline-none focus:border-[var(--accent)]"
          />
        </Row>

        <Row label="休憩時間（分）">
          <input
            type="number"
            min={1}
            max={30}
            value={s.pomodoroBreakDuration}
            onChange={(e) => s.setPomodoroSettings({ pomodoroBreakDuration: Number(e.target.value) })}
            className="w-20 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-primary)] px-2 py-1 text-sm text-right focus:outline-none focus:border-[var(--accent)]"
          />
        </Row>

        <Row label="長休憩時間（分）">
          <input
            type="number"
            min={5}
            max={60}
            value={s.pomodoroLongBreak}
            onChange={(e) => s.setPomodoroSettings({ pomodoroLongBreak: Number(e.target.value) })}
            className="w-20 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-primary)] px-2 py-1 text-sm text-right focus:outline-none focus:border-[var(--accent)]"
          />
        </Row>

        <Row label="長休憩サイクル数">
          <input
            type="number"
            min={1}
            max={10}
            value={s.pomodoroLongBreakAfter}
            onChange={(e) => s.setPomodoroSettings({ pomodoroLongBreakAfter: Number(e.target.value) })}
            className="w-20 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-primary)] px-2 py-1 text-sm text-right focus:outline-none focus:border-[var(--accent)]"
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
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-primary)] px-2 py-1 text-sm focus:outline-none focus:border-[var(--accent)] disabled:opacity-40"
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
                  "px-3 py-1 rounded-lg text-xs font-medium border transition-colors tracking-wide",
                  s.defaultView === v
                    ? "bg-[var(--accent)] text-white dark:text-[#0f0f0f] border-transparent"
                    : "bg-transparent text-[var(--text-muted)] border-[var(--border)] hover:border-[var(--text-subtle)] hover:text-[var(--text-primary)]",
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
