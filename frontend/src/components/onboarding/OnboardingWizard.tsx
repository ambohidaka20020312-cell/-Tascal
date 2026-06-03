import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

interface OnboardingWizardProps {
  onComplete: () => void;
  onSkip: () => void;
}

const STEPS = ["welcome", "task", "done"] as const;
type Step = (typeof STEPS)[number];

export default function OnboardingWizard({ onComplete, onSkip }: OnboardingWizardProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [taskTitle, setTaskTitle] = useState("");
  const navigate = useNavigate();

  const step: Step = STEPS[stepIndex];

  const handleNext = () => {
    if (stepIndex < STEPS.length - 1) {
      setStepIndex((i) => i + 1);
    }
  };

  const handleDone = () => {
    onComplete();
    navigate("/");
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[var(--bg-primary)] px-4">
      {/* Step indicator */}
      <div className="flex gap-2 mb-10">
        {STEPS.map((_, i) => (
          <span
            key={i}
            className={`w-2 h-2 rounded-full transition-colors ${
              i === stepIndex
                ? "bg-[var(--text-primary)]"
                : "bg-[var(--border)]"
            }`}
          />
        ))}
      </div>

      {/* Content */}
      <div className="w-full max-w-sm flex flex-col items-center text-center">
        {step === "welcome" && (
          <>
            <h1 className="text-2xl font-light tracking-wide text-[var(--text-primary)] mb-6">
              TASCALへようこそ
            </h1>
            <ul className="space-y-3 mb-10 text-left w-full">
              {[
                "AIがあなたのタスクを毎日最適化",
                "超過を検知してリアルタイムで再スケジュール",
                "過去の実績から個人の傾向を学習",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-[var(--text-primary)] shrink-0" />
                  <span className="text-sm text-[var(--text-muted)]">{item}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={handleNext}
              className="w-full h-11 bg-[var(--text-primary)] text-[var(--bg-primary)] text-sm tracking-wide mb-4 hover:opacity-80 transition-opacity"
            >
              次へ
            </button>
          </>
        )}

        {step === "task" && (
          <>
            <h1 className="text-2xl font-light tracking-wide text-[var(--text-primary)] mb-3">
              最初のタスクを作成
            </h1>
            <p className="text-xs text-[var(--text-muted)] mb-6">
              タスクのタイトルを入力してください。AIが今日のプランに追加します。
            </p>
            <input
              type="text"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder="例: 週次レポートを作成する"
              className="w-full border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] text-sm px-3 py-2.5 mb-10 placeholder:text-[var(--text-subtle)] focus:outline-none focus:border-[var(--text-muted)]"
            />
            <button
              onClick={handleNext}
              className="w-full h-11 bg-[var(--text-primary)] text-[var(--bg-primary)] text-sm tracking-wide mb-4 hover:opacity-80 transition-opacity"
            >
              次へ
            </button>
          </>
        )}

        {step === "done" && (
          <>
            <h1 className="text-2xl font-light tracking-wide text-[var(--text-primary)] mb-3">
              準備完了！
            </h1>
            <p className="text-xs text-[var(--text-muted)] mb-10">
              TASCALを使い始めましょう。
            </p>
            <button
              onClick={handleDone}
              className="w-full h-11 bg-[var(--text-primary)] text-[var(--bg-primary)] text-sm tracking-wide mb-4 hover:opacity-80 transition-opacity"
            >
              ダッシュボードへ
            </button>
          </>
        )}

        <button
          onClick={onSkip}
          className="text-xs text-[var(--text-subtle)] underline"
        >
          スキップ
        </button>
      </div>
    </div>
  );
}
