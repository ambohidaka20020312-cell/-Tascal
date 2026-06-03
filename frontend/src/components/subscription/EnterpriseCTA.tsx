const BENEFITS = [
  {
    title: "AIタスク振り分け",
    description: "チームメンバーのスキルと負荷をAIが自動分析し、最適なタスク割り当てを提案します。",
  },
  {
    title: "ローカルLLM対応",
    description: "社内データをクラウドに送らず、オンプレミス環境でAI機能を安全に利用できます。",
  },
  {
    title: "専任サポート",
    description: "導入支援から運用定着まで、専任のカスタマーサクセスチームが伴走します。",
  },
];

export default function EnterpriseCTA() {
  return (
    <div className="rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50 p-6 sm:p-8">
      <div className="mb-6 text-center sm:text-left">
        <span className="inline-block rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700 mb-3">
          法人・Enterprise
        </span>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
          法人でのご利用をご検討の方へ
        </h2>
        <p className="mt-2 text-sm text-gray-500">
          10名以上のチームや高度なセキュリティ要件にお応えする Enterprise プランをご用意しています。
        </p>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {BENEFITS.map((benefit) => (
          <div
            key={benefit.title}
            className="rounded-xl bg-white p-4 shadow-sm border border-purple-100"
          >
            <h3 className="mb-1 text-sm font-semibold text-gray-900">
              {benefit.title}
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              {benefit.description}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-3">
        <a
          href="mailto:enterprise@tascal.app"
          className="inline-flex items-center justify-center rounded-lg bg-purple-600 hover:bg-purple-700 px-6 py-3 text-sm font-semibold text-white shadow transition-colors"
        >
          資料請求・お問い合わせ
        </a>
        <span className="text-xs text-gray-400">
          通常1営業日以内にご返信いたします
        </span>
      </div>
    </div>
  );
}
