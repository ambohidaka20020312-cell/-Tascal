import React from "react";
import { useSettingsStore } from "../store/settingsStore";
import PushNotificationToggle from "../components/settings/PushNotificationToggle";
import NotificationSettings from "../components/settings/NotificationSettings";
import LanguageSwitcher from "../components/common/LanguageSwitcher";
import { useGoogleCalendar, useGoogleCalendarStatus } from "../hooks/useGoogleCalendar";

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

        <Row label="プッシュ通知">
          <PushNotificationToggle />
        </Row>
      </Section>

      <NotificationSettings />

      <Section>
        <SectionTitle>言語 / Language</SectionTitle>
        <Row label="言語">
          <LanguageSwitcher />
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

      <GoogleCalendarSection />
    </div>
  );
}

function GoogleCalendarSection() {
  const { data: status, isLoading } = useGoogleCalendarStatus();
  const { connect, disconnect, isDisconnecting, sync, isSyncing, syncResult } = useGoogleCalendar();

  return (
    <Section>
      <SectionTitle>外部連携</SectionTitle>

      <div className="flex items-start justify-between py-2 gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <svg className="w-6 h-6 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          <div className="min-w-0">
            <p className="text-sm font-medium text-[var(--text-primary)]">Googleカレンダー</p>
            {isLoading ? (
              <p className="text-xs text-[var(--text-muted)]">確認中...</p>
            ) : status?.connected ? (
              <p className="text-xs text-green-500 flex items-center gap-1">
                <span>&#10003;</span> 連携済み
              </p>
            ) : (
              <p className="text-xs text-[var(--text-muted)]">未連携</p>
            )}
            {syncResult && (
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                {syncResult.synced}件同期済み
                {syncResult.errors > 0 && `（エラー: ${syncResult.errors}件）`}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!isLoading && status?.connected ? (
            <>
              <button
                onClick={() => sync()}
                disabled={isSyncing}
                className="px-3 py-1 rounded-lg text-xs font-medium border border-[var(--border)] text-[var(--text-primary)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors disabled:opacity-40"
              >
                {isSyncing ? "同期中..." : "今すぐ同期"}
              </button>
              <button
                onClick={() => disconnect()}
                disabled={isDisconnecting}
                className="px-3 py-1 rounded-lg text-xs font-medium border border-[var(--border)] text-[var(--text-muted)] hover:border-red-400 hover:text-red-400 transition-colors disabled:opacity-40"
              >
                {isDisconnecting ? "解除中..." : "連携解除"}
              </button>
            </>
          ) : (
            <button
              onClick={connect}
              disabled={isLoading}
              className="px-3 py-1 rounded-lg text-xs font-medium bg-[var(--accent)] text-white dark:text-[#0f0f0f] border-transparent hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              Googleカレンダーと連携する
            </button>
          )}
        </div>
      </div>
    </Section>
  );
}
