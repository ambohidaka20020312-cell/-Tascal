import { useRevenueCat } from "../../hooks/useRevenueCat";

type UpgradeReason = "task_limit" | "ai_limit" | "insights" | "generic";

interface UpgradePromptProps {
  isOpen: boolean;
  onClose: () => void;
  reason?: UpgradeReason;
  message?: string;
}

const MESSAGES: Record<UpgradeReason, { title: string; body: string }> = {
  task_limit: {
    title: "タスク上限に達しました",
    body: "今月のタスク上限（20件）に達しました。Proプランで無制限にタスクを作成できます。",
  },
  ai_limit: {
    title: "AI最適化の上限に達しました",
    body: "本日のAI最適化回数（3回）に達しました。Proプランで無制限にご利用いただけます。",
  },
  insights: {
    title: "Proプランの機能です",
    body: "週次インサイトはProプラン以上でご利用いただけます。",
  },
  generic: {
    title: "プランをアップグレード",
    body: "この機能はProプラン以上でご利用いただけます。",
  },
};

const PLAN_FEATURES = [
  { feature: "タスク数", free: "20件/月", pro: "無制限", team: "無制限" },
  { feature: "AI最適化", free: "3回/日", pro: "無制限", team: "無制限" },
  { feature: "週次インサイト", free: "✗", pro: "✓", team: "✓" },
  { feature: "広告", free: "表示", pro: "非表示", team: "非表示" },
  { feature: "チーム共有", free: "✗", pro: "✗", team: "最大5名" },
];

export default function UpgradePrompt({ isOpen, onClose, reason = "generic", message }: UpgradePromptProps) {
  const { purchasePro, isLoading, error } = useRevenueCat();

  if (!isOpen) return null;

  const { title, body } = MESSAGES[reason];

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="upgrade-title"
        className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border)] w-full max-w-sm shadow-xl"
      >
        <div className="px-6 py-5 border-b border-[var(--border)] flex items-center justify-between">
          <h2 id="upgrade-title" className="text-sm font-semibold tracking-[0.1em] uppercase text-[var(--text-primary)]">{title}</h2>
          <button onClick={onClose} className="text-[var(--text-subtle)] hover:text-[var(--text-primary)] text-lg leading-none">×</button>
        </div>

        <div className="px-6 py-4">
          <p className="text-sm text-[var(--text-muted)] mb-5 leading-relaxed">{message ?? body}</p>

          <table className="w-full text-xs mb-5">
            <thead>
              <tr className="text-[10px] tracking-[0.15em] uppercase text-[var(--text-subtle)]">
                <th className="text-left pb-2 font-normal"></th>
                <th className="text-center pb-2 font-normal">Free</th>
                <th className="text-center pb-2 font-normal border-x border-[var(--border)] px-2 text-[var(--text-primary)]">Pro</th>
                <th className="text-center pb-2 font-normal">Team</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {PLAN_FEATURES.map(({ feature, free, pro, team }) => (
                <tr key={feature}>
                  <td className="py-2 text-[var(--text-muted)]">{feature}</td>
                  <td className="py-2 text-center text-[var(--text-subtle)]">{free}</td>
                  <td className="py-2 text-center border-x border-[var(--border)] px-2 text-[var(--text-primary)] font-medium">{pro}</td>
                  <td className="py-2 text-center text-[var(--text-subtle)]">{team}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {error && (
            <p className="mb-3 text-xs text-red-500 text-center">{error}</p>
          )}
          <button
            onClick={() => purchasePro()}
            disabled={isLoading}
            className="w-full h-10 bg-[var(--text-primary)] text-[var(--bg-primary)] text-xs font-semibold tracking-[0.15em] uppercase rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-[var(--bg-primary)] border-t-transparent rounded-full animate-spin" />
                処理中...
              </>
            ) : (
              "Proにアップグレード — ¥480/月"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
