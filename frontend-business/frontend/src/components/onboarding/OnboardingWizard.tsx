import { useState } from "react";
import { useAuthStore } from "../../store/authStore";
import { authApi, taskApi } from "../../utils/api";

interface OnboardingWizardProps {
  onComplete: () => void;
}

const TOTAL_STEPS = 5;

const WORK_STYLES = [
  { id: "personal", emoji: "📋", label: "個人タスク管理" },
  { id: "team", emoji: "👥", label: "チームでの共同作業" },
  { id: "goals", emoji: "🎯", label: "目標・習慣管理" },
] as const;

type WorkStyleId = (typeof WORK_STYLES)[number]["id"];

const DAILY_HOURS = [
  { id: "lt4", label: "4時間未満" },
  { id: "4to8", label: "4〜8時間" },
  { id: "8to10", label: "8〜10時間" },
  { id: "gt10", label: "10時間以上" },
] as const;

type DailyHoursId = (typeof DAILY_HOURS)[number]["id"];

const PRIORITIES = [
  { value: "low", label: "低" },
  { value: "medium", label: "中" },
  { value: "high", label: "高" },
] as const;

type Priority = (typeof PRIORITIES)[number]["value"];

export default function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const { user, updateUser } = useAuthStore();

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Step 1 state
  const [selectedStyles, setSelectedStyles] = useState<WorkStyleId[]>([]);

  // Step 2 state
  const [selectedHours, setSelectedHours] = useState<DailyHoursId | null>(null);

  // Step 3 state
  const [taskTitle, setTaskTitle] = useState("");
  const [taskPriority, setTaskPriority] = useState<Priority>("medium");

  const toggleStyle = (id: WorkStyleId) => {
    setSelectedStyles((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleNext = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  const handleBack = () => setStep((s) => Math.max(s - 1, 0));

  const handleFinish = async () => {
    setSubmitting(true);
    try {
      // If user entered a task title, create the task
      if (taskTitle.trim()) {
        try {
          await taskApi.create({ title: taskTitle.trim(), priority: taskPriority });
        } catch {
          // Non-fatal — continue
        }
      }
      // Mark onboarding complete
      const res = await authApi.updateProfile({ onboarding_completed: true });
      const updatedUser = res.data?.data?.user;
      if (updatedUser) {
        updateUser(updatedUser);
      } else {
        updateUser({ onboarding_completed: true });
      }
    } catch {
      updateUser({ onboarding_completed: true });
    } finally {
      setSubmitting(false);
      onComplete();
    }
  };

  const progressPercent = Math.round(((step + 1) / TOTAL_STEPS) * 100);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[var(--bg-primary)] px-4">
      {/* Progress bar */}
      <div className="w-full max-w-sm mb-8">
        <div className="h-0.5 bg-[var(--border)] w-full">
          <div
            className="h-0.5 bg-[var(--text-primary)] transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="text-[10px] text-[var(--text-subtle)] mt-1.5 text-right">
          {step + 1} / {TOTAL_STEPS}
        </p>
      </div>

      {/* Step content */}
      <div
        key={step}
        className="w-full max-w-sm flex flex-col items-center text-center animate-fadeIn"
      >
        {/* ── Step 0: Welcome ── */}
        {step === 0 && (
          <>
            <div className="text-4xl mb-4">✨</div>
            <h1 className="text-2xl font-light tracking-wide text-[var(--text-primary)] mb-2">
              Tascalへようこそ！
            </h1>
            {user?.name && (
              <p className="text-sm text-[var(--text-muted)] mb-1">{user.name} さん</p>
            )}
            <p className="text-xs text-[var(--text-subtle)] mb-8">
              AIがあなたのタスクを毎日最適化します
            </p>

            <ul className="space-y-3 mb-10 text-left w-full">
              {[
                { emoji: "🤖", text: "AIがあなたのタスクを毎日最適化" },
                { emoji: "⚡", text: "超過を検知してリアルタイムで再スケジュール" },
                { emoji: "📈", text: "過去の実績から個人の傾向を学習" },
              ].map(({ emoji, text }) => (
                <li
                  key={text}
                  className="flex items-center gap-3 px-4 py-3 border border-[var(--border)] bg-[var(--bg-secondary)]"
                >
                  <span className="text-lg">{emoji}</span>
                  <span className="text-sm text-[var(--text-muted)]">{text}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={handleNext}
              className="w-full h-11 bg-[var(--text-primary)] text-[var(--bg-primary)] text-sm tracking-wide hover:opacity-80 transition-opacity"
            >
              次へ
            </button>
          </>
        )}

        {/* ── Step 1: Work style ── */}
        {step === 1 && (
          <>
            <div className="text-4xl mb-4">🗂️</div>
            <h1 className="text-2xl font-light tracking-wide text-[var(--text-primary)] mb-2">
              どのような使い方をしますか？
            </h1>
            <p className="text-xs text-[var(--text-subtle)] mb-8">複数選択できます</p>

            <div className="w-full space-y-3 mb-10">
              {WORK_STYLES.map(({ id, emoji, label }) => {
                const selected = selectedStyles.includes(id);
                return (
                  <button
                    key={id}
                    onClick={() => toggleStyle(id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 border text-left transition-colors ${
                      selected
                        ? "border-[var(--text-primary)] bg-[var(--bg-secondary)]"
                        : "border-[var(--border)] bg-[var(--bg-primary)]"
                    }`}
                  >
                    <span className="text-xl">{emoji}</span>
                    <span className="text-sm text-[var(--text-primary)]">{label}</span>
                    {selected && (
                      <span className="ml-auto w-4 h-4 flex items-center justify-center border border-[var(--text-primary)] text-[var(--text-primary)]">
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 10 10"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                        >
                          <path d="M1.5 5l2.5 2.5 4.5-4.5" />
                        </svg>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <button
              onClick={handleNext}
              className="w-full h-11 bg-[var(--text-primary)] text-[var(--bg-primary)] text-sm tracking-wide hover:opacity-80 transition-opacity"
            >
              次へ
            </button>
            <button
              onClick={handleBack}
              className="mt-4 text-xs text-[var(--text-subtle)] underline"
            >
              戻る
            </button>
          </>
        )}

        {/* ── Step 2: Daily schedule ── */}
        {step === 2 && (
          <>
            <div className="text-4xl mb-4">🕐</div>
            <h1 className="text-2xl font-light tracking-wide text-[var(--text-primary)] mb-2">
              1日の作業時間は？
            </h1>
            <p className="text-xs text-[var(--text-subtle)] mb-8">
              AIの最適化精度が上がります
            </p>

            <div className="w-full grid grid-cols-2 gap-3 mb-10">
              {DAILY_HOURS.map(({ id, label }) => {
                const selected = selectedHours === id;
                return (
                  <button
                    key={id}
                    onClick={() => setSelectedHours(id)}
                    className={`px-4 py-3 border text-sm transition-colors ${
                      selected
                        ? "border-[var(--text-primary)] bg-[var(--bg-secondary)] text-[var(--text-primary)] font-medium"
                        : "border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-muted)]"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <button
              onClick={handleNext}
              className="w-full h-11 bg-[var(--text-primary)] text-[var(--bg-primary)] text-sm tracking-wide hover:opacity-80 transition-opacity"
            >
              次へ
            </button>
            <button
              onClick={handleBack}
              className="mt-4 text-xs text-[var(--text-subtle)] underline"
            >
              戻る
            </button>
          </>
        )}

        {/* ── Step 3: First task ── */}
        {step === 3 && (
          <>
            <div className="text-4xl mb-4">📝</div>
            <h1 className="text-2xl font-light tracking-wide text-[var(--text-primary)] mb-2">
              最初のタスクを追加してみましょう
            </h1>
            <p className="text-xs text-[var(--text-subtle)] mb-8">
              後からでも追加できます
            </p>

            <div className="w-full space-y-4 mb-10 text-left">
              <div>
                <label className="block text-[10px] tracking-[0.15em] uppercase text-[var(--text-subtle)] mb-2">
                  タスクのタイトル
                </label>
                <input
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="例: 企画書を作成する"
                  className="w-full border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] text-sm px-3 py-2.5 placeholder:text-[var(--text-subtle)] focus:outline-none focus:border-[var(--text-muted)]"
                />
              </div>

              <div>
                <label className="block text-[10px] tracking-[0.15em] uppercase text-[var(--text-subtle)] mb-2">
                  優先度
                </label>
                <div className="flex gap-2">
                  {PRIORITIES.map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setTaskPriority(value)}
                      className={`flex-1 py-2 text-sm border transition-colors ${
                        taskPriority === value
                          ? "border-[var(--text-primary)] bg-[var(--bg-secondary)] text-[var(--text-primary)] font-medium"
                          : "border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-muted)]"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={handleNext}
              className="w-full h-11 bg-[var(--text-primary)] text-[var(--bg-primary)] text-sm tracking-wide hover:opacity-80 transition-opacity"
            >
              次へ
            </button>
            <div className="flex gap-4 mt-4 text-xs text-[var(--text-subtle)]">
              <button onClick={handleBack} className="underline">
                戻る
              </button>
              <button onClick={handleNext} className="underline">
                スキップ
              </button>
            </div>
          </>
        )}

        {/* ── Step 4: Complete ── */}
        {step === 4 && (
          <>
            <div className="text-4xl mb-4">🎉</div>
            <h1 className="text-2xl font-light tracking-wide text-[var(--text-primary)] mb-2">
              準備完了！
            </h1>
            <p className="text-xs text-[var(--text-subtle)] mb-8">
              Tascalで生産性を高めましょう
            </p>

            {/* Summary card */}
            <div className="w-full border border-[var(--border)] bg-[var(--bg-secondary)] p-4 mb-10 text-left space-y-2">
              {selectedStyles.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedStyles.map((id) => {
                    const style = WORK_STYLES.find((s) => s.id === id);
                    return style ? (
                      <span
                        key={id}
                        className="text-xs px-2 py-1 border border-[var(--border)] text-[var(--text-muted)]"
                      >
                        {style.emoji} {style.label}
                      </span>
                    ) : null;
                  })}
                </div>
              )}
              {selectedHours && (
                <p className="text-xs text-[var(--text-muted)]">
                  作業時間:{" "}
                  <span className="text-[var(--text-primary)]">
                    {DAILY_HOURS.find((h) => h.id === selectedHours)?.label}
                  </span>
                </p>
              )}
              {taskTitle.trim() && (
                <p className="text-xs text-[var(--text-muted)]">
                  最初のタスク:{" "}
                  <span className="text-[var(--text-primary)]">{taskTitle.trim()}</span>
                </p>
              )}
              {selectedStyles.length === 0 && !selectedHours && !taskTitle.trim() && (
                <p className="text-xs text-[var(--text-subtle)]">設定をスキップしました</p>
              )}
            </div>

            <button
              onClick={handleFinish}
              disabled={submitting}
              className="w-full h-11 bg-[var(--text-primary)] text-[var(--bg-primary)] text-sm tracking-wide hover:opacity-80 transition-opacity disabled:opacity-50"
            >
              {submitting ? "保存中..." : "さあ始めましょう"}
            </button>
            <button
              onClick={handleBack}
              className="mt-4 text-xs text-[var(--text-subtle)] underline"
            >
              戻る
            </button>
          </>
        )}
      </div>
    </div>
  );
}
