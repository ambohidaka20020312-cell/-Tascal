import { useState } from "react";
import { useAuthStore } from "../../store/authStore";
import { useSettingsStore } from "../../store/settingsStore";
import { authApi } from "../../utils/api";

interface OnboardingWizardProps {
  onComplete: () => void;
}

const TOTAL_STEPS = 3;

export default function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const { user, updateUser } = useAuthStore();
  const { setWorkPreferences, setNotificationsEnabled } = useSettingsStore();

  // Step 0 state
  const [name, setName] = useState(user?.name ?? "");

  // Step 1 state
  const [workHours, setWorkHours] = useState(8);
  const [taskDuration, setTaskDuration] = useState(30);

  // Step 2 state
  const [notifStatus, setNotifStatus] = useState<"idle" | "granted" | "denied">("idle");

  const [stepIndex, setStepIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const handleNext = () => setStepIndex((i) => Math.min(i + 1, TOTAL_STEPS - 1));

  const handleRequestNotif = async () => {
    if (!("Notification" in window)) {
      setNotifStatus("denied");
      return;
    }
    const result = await Notification.requestPermission();
    setNotifStatus(result === "granted" ? "granted" : "denied");
    setNotificationsEnabled(result === "granted");
  };

  const handleComplete = async () => {
    setSubmitting(true);
    try {
      const trimmedName = name.trim();
      const res = await authApi.updateProfile({
        name: trimmedName || undefined,
        onboarding_completed: true,
      });
      const updatedUser = res.data?.data?.user;
      if (updatedUser) {
        updateUser(updatedUser);
      } else {
        updateUser({ onboarding_completed: true, name: trimmedName || user?.name });
      }
      setWorkPreferences({ workHoursPerDay: workHours, defaultTaskDuration: taskDuration });
    } catch {
      // Dismiss wizard even if API fails so user is never stuck
      updateUser({ onboarding_completed: true });
    } finally {
      setSubmitting(false);
      onComplete();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[var(--bg-primary)] px-4">
      {/* Step dots */}
      <div className="flex gap-2 mb-10">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <span
            key={i}
            className={`w-2 h-2 rounded-full transition-colors ${
              i === stepIndex ? "bg-[var(--text-primary)]" : "bg-[var(--border)]"
            }`}
          />
        ))}
      </div>

      <div className="w-full max-w-sm flex flex-col items-center text-center">
        {/* ── Step 0: Name / Welcome ── */}
        {stepIndex === 0 && (
          <>
            <h1 className="text-2xl font-light tracking-wide text-[var(--text-primary)] mb-2">
              TASCALへようこそ
            </h1>
            <p className="text-xs text-[var(--text-muted)] mb-8">
              AIがあなたのタスクを最適化します。まずお名前を教えてください。
            </p>

            <div className="w-full text-left mb-6">
              <label className="block text-[10px] tracking-[0.15em] uppercase text-[var(--text-subtle)] mb-2">
                お名前
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例: 山田 太郎"
                className="w-full border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] text-sm px-3 py-2.5 placeholder:text-[var(--text-subtle)] focus:outline-none focus:border-[var(--text-muted)]"
              />
            </div>

            <ul className="space-y-3 mb-10 text-left w-full">
              {[
                "AIがあなたのタスクを毎日最適化",
                "超過を検知してリアルタイムで再スケジュール",
                "過去の実績から個人の傾向を学習",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1 w-1.5 h-1.5 rounded-full bg-[var(--text-primary)] shrink-0" />
                  <span className="text-sm text-[var(--text-muted)]">{item}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={handleNext}
              className="w-full h-11 bg-[var(--text-primary)] text-[var(--bg-primary)] text-sm tracking-wide hover:opacity-80 transition-opacity"
            >
              次へ
            </button>
            <button
              onClick={() => setStepIndex(2)}
              className="mt-4 text-xs text-[var(--text-subtle)] underline"
            >
              スキップ
            </button>
          </>
        )}

        {/* ── Step 1: Work preferences ── */}
        {stepIndex === 1 && (
          <>
            <h1 className="text-2xl font-light tracking-wide text-[var(--text-primary)] mb-2">
              作業スタイルを設定
            </h1>
            <p className="text-xs text-[var(--text-muted)] mb-8">
              AIの最適化精度を上げるために、日々の作業スタイルを教えてください。
            </p>

            <div className="w-full text-left space-y-6 mb-10">
              <div>
                <label className="block text-[10px] tracking-[0.15em] uppercase text-[var(--text-subtle)] mb-2">
                  1日の作業時間:{" "}
                  <span className="text-[var(--text-primary)] font-medium">{workHours}時間</span>
                </label>
                <input
                  type="range"
                  min={1}
                  max={16}
                  value={workHours}
                  onChange={(e) => setWorkHours(Number(e.target.value))}
                  className="w-full accent-[var(--text-primary)]"
                />
                <div className="flex justify-between text-[10px] text-[var(--text-subtle)] mt-1">
                  <span>1時間</span>
                  <span>16時間</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] tracking-[0.15em] uppercase text-[var(--text-subtle)] mb-2">
                  タスクの標準所要時間:{" "}
                  <span className="text-[var(--text-primary)] font-medium">{taskDuration}分</span>
                </label>
                <input
                  type="range"
                  min={15}
                  max={120}
                  step={15}
                  value={taskDuration}
                  onChange={(e) => setTaskDuration(Number(e.target.value))}
                  className="w-full accent-[var(--text-primary)]"
                />
                <div className="flex justify-between text-[10px] text-[var(--text-subtle)] mt-1">
                  <span>15分</span>
                  <span>2時間</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleNext}
              className="w-full h-11 bg-[var(--text-primary)] text-[var(--bg-primary)] text-sm tracking-wide hover:opacity-80 transition-opacity"
            >
              次へ
            </button>
            <button
              onClick={() => setStepIndex(2)}
              className="mt-4 text-xs text-[var(--text-subtle)] underline"
            >
              スキップ
            </button>
          </>
        )}

        {/* ── Step 2: Notifications ── */}
        {stepIndex === 2 && (
          <>
            <h1 className="text-2xl font-light tracking-wide text-[var(--text-primary)] mb-2">
              通知の設定
            </h1>
            <p className="text-xs text-[var(--text-muted)] mb-8">
              タスクのリマインダーや、AIからのアドバイスを受け取りますか？
            </p>

            <div className="w-full mb-8 space-y-3">
              {notifStatus === "idle" && (
                <button
                  onClick={handleRequestNotif}
                  className="w-full h-11 border border-[var(--border)] text-[var(--text-primary)] text-sm tracking-wide hover:bg-[var(--bg-secondary)] transition-colors"
                >
                  通知を許可する
                </button>
              )}
              {notifStatus === "granted" && (
                <div className="flex items-center gap-2 justify-center py-3">
                  <span className="w-2 h-2 rounded-full bg-[var(--text-primary)]" />
                  <span className="text-sm text-[var(--text-muted)]">通知が許可されました</span>
                </div>
              )}
              {notifStatus === "denied" && (
                <div className="flex items-center gap-2 justify-center py-3">
                  <span className="text-sm text-[var(--text-subtle)]">
                    通知はブロックされています。後でブラウザ設定から変更できます。
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={handleComplete}
              disabled={submitting}
              className="w-full h-11 bg-[var(--text-primary)] text-[var(--bg-primary)] text-sm tracking-wide hover:opacity-80 transition-opacity disabled:opacity-50"
            >
              {submitting ? "保存中..." : "完了"}
            </button>

            {notifStatus === "idle" && (
              <button
                onClick={handleComplete}
                disabled={submitting}
                className="mt-4 text-xs text-[var(--text-subtle)] underline disabled:opacity-50"
              >
                スキップして完了
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
