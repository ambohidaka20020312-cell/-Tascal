
interface HelpSection {
  title: string;
  description: string;
  badge?: string;
}

const SECTIONS: HelpSection[] = [
  {
    title: "今日のタスク",
    description:
      "タスクを追加して、AIに最適化してもらおう。優先度・目標時間・締め切りを設定することで、AIがより精度の高いスケジュールを提案できます。",
  },
  {
    title: "AI最適化",
    description:
      "「最適化」ボタンで今日のスケジュールをAIが提案します。タスクが時間超過になった場合も、残りのタスクを自動で再スケジュールします。",
  },
  {
    title: "カレンダー",
    description:
      "予定を先に登録して計画的に管理できます。月・週・日ビューの切り替えや、ドラッグ＆ドロップでのタスク移動に対応しています。",
  },
  {
    title: "インサイト",
    description:
      "週次レポートで自分の傾向を把握できます。完了率や時間の使い方を分析して、生産性向上に役立てましょう。",
    badge: "Pro",
  },
  {
    title: "チーム",
    description:
      "メンバーを招待してタスクを共有できます。チーム全体の進捗を一元管理し、効率的にプロジェクトを進めましょう。",
    badge: "Team",
  },
];

export default function HelpPage() {
  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-wide mb-2">
        ヘルプ / チュートリアル
      </h1>
      <p className="text-sm text-[var(--text-muted)] mb-8">
        Tascal の主な機能をご紹介します。
      </p>

      <div className="space-y-4">
        {SECTIONS.map((section) => (
          <div
            key={section.title}
            className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-5"
          >
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-base font-semibold text-[var(--text-primary)]">
                {section.title}
              </h2>
              {section.badge && (
                <span
                  className={[
                    "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold tracking-wide",
                    section.badge === "Pro"
                      ? "bg-[var(--accent)] text-white dark:text-[#0f0f0f]"
                      : "bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border)]",
                  ].join(" ")}
                >
                  {section.badge}
                </span>
              )}
            </div>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
              {section.description}
            </p>
          </div>
        ))}
      </div>

      <p className="mt-8 text-xs text-[var(--text-subtle)] text-center">
        ご不明な点はサポートまでお問い合わせください。
      </p>
    </div>
  );
}
