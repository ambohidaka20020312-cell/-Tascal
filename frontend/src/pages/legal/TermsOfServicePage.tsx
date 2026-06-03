import { Link } from "react-router-dom";

export default function TermsOfServicePage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-light tracking-wide text-[var(--text-primary)] mb-2">
        利用規約
      </h1>
      <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-10">
        最終更新日: 2026年6月3日
      </p>

      <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-6">
        本利用規約（以下「本規約」）は、[会社名]（以下「当社」）が提供するタスク管理サービス「Tascal」（以下「本サービス」）の利用条件を定めるものです。
        本サービスをご利用いただく前に、本規約をよくお読みください。
        本サービスにアクセスまたは利用することにより、本規約に同意したものとみなします。
      </p>

      {/* 1. 利用条件 */}
      <h2 className="text-sm font-semibold tracking-[0.15em] uppercase text-[var(--text-primary)] mt-10 mb-3">
        1. 利用条件・年齢制限
      </h2>
      <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-4">
        本サービスのご利用には以下の条件を満たす必要があります。
      </p>
      <ul className="text-sm text-[var(--text-muted)] space-y-1 pl-4 list-disc mb-4">
        <li>13歳以上であること（COPPA準拠）</li>
        <li>EU/EEA居住者の場合は16歳以上であること（GDPR第8条）</li>
        <li>本規約および当社の<Link to="/privacy" className="underline">プライバシーポリシー</Link>に同意すること</li>
        <li>適用される法令を遵守すること</li>
      </ul>
      <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-4">
        13歳未満（EU/EEAは16歳未満）の方のご利用は禁止しており、発覚した場合はアカウントを削除します。
      </p>

      {/* 2. アカウント */}
      <h2 className="text-sm font-semibold tracking-[0.15em] uppercase text-[var(--text-primary)] mt-10 mb-3">
        2. アカウント
      </h2>
      <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-4">
        本サービスを利用するにはアカウントの登録が必要です。
      </p>
      <ul className="text-sm text-[var(--text-muted)] space-y-1 pl-4 list-disc mb-4">
        <li>正確かつ最新の情報を提供してください</li>
        <li>アカウントのパスワードは安全に管理し、第三者に共有しないでください</li>
        <li>アカウントで行われた一切の活動について、お客様が責任を負います</li>
        <li>不正利用を発見した場合は直ちに privacy@tascal.app へご連絡ください</li>
        <li>1人につき1アカウントのみ作成できます</li>
      </ul>

      {/* 3. サービス内容 */}
      <h2 className="text-sm font-semibold tracking-[0.15em] uppercase text-[var(--text-primary)] mt-10 mb-3">
        3. サービス内容・プラン
      </h2>
      <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-4">
        本サービスは以下のプランを提供します。
      </p>
      <ul className="text-sm text-[var(--text-muted)] space-y-1 pl-4 list-disc mb-4">
        <li><strong>Freeプラン</strong> — タスク20件/月、AI最適化3回/日。広告が表示されます。</li>
        <li><strong>Proプラン（¥980/月）</strong> — 無制限タスク、AI最適化無制限、高度な分析、広告非表示。</li>
        <li><strong>Teamプラン（¥2,980/月）</strong> — Pro機能に加え、最大5名のチーム共有機能。</li>
      </ul>
      <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-4">
        当社はサービス内容を予告なく変更する場合があります。重要な変更については、30日前までにメールでお知らせします。
      </p>

      {/* 4. 支払い */}
      <h2 className="text-sm font-semibold tracking-[0.15em] uppercase text-[var(--text-primary)] mt-10 mb-3">
        4. 支払い・返金ポリシー
      </h2>
      <ul className="text-sm text-[var(--text-muted)] space-y-1 pl-4 list-disc mb-4">
        <li>決済はStripe, Inc.を通じて処理されます</li>
        <li>サブスクリプション料金は毎月自動で請求されます</li>
        <li>解約はいつでも可能です。解約後も当該請求期間の末日まで利用できます</li>
        <li>原則として返金はお受けしていませんが、技術的な問題によりサービスをご利用いただけなかった場合はご相談ください</li>
        <li>消費税その他の税金は別途適用される場合があります</li>
      </ul>

      {/* 5. 知的財産 */}
      <h2 className="text-sm font-semibold tracking-[0.15em] uppercase text-[var(--text-primary)] mt-10 mb-3">
        5. 知的財産
      </h2>
      <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-4">
        本サービスのソフトウェア、デザイン、テキスト、ロゴ等の知的財産権は当社または正当な権利者に帰属します。
        ユーザーが作成したタスクデータ等のコンテンツ（以下「ユーザーコンテンツ」）の著作権はユーザーに帰属します。
        ユーザーは当社に対し、本サービスの提供・改善目的でユーザーコンテンツを利用する非独占的ライセンスを付与するものとします。
      </p>

      {/* 6. 禁止行為 */}
      <h2 className="text-sm font-semibold tracking-[0.15em] uppercase text-[var(--text-primary)] mt-10 mb-3">
        6. 禁止行為
      </h2>
      <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-4">
        以下の行為を禁止します。
      </p>
      <ul className="text-sm text-[var(--text-muted)] space-y-1 pl-4 list-disc mb-4">
        <li>スパムメールの送信、不正アクセスまたはその試み</li>
        <li>本サービスのリバースエンジニアリング・逆コンパイル</li>
        <li>他のユーザーまたは第三者の権利を侵害する行為</li>
        <li>違法なコンテンツの送信・保存</li>
        <li>APIの過剰利用によるサーバーへの過負荷</li>
        <li>当社の競合サービスの開発を目的とした利用</li>
        <li>適用される法令に違反する行為</li>
      </ul>

      {/* 7. 免責事項 */}
      <h2 className="text-sm font-semibold tracking-[0.15em] uppercase text-[var(--text-primary)] mt-10 mb-3">
        7. 免責事項
      </h2>
      <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-4">
        本サービスはAIによるタスク最適化・提案機能を提供しますが、AI出力はあくまでも参考情報であり、意思決定の最終判断はユーザー自身が行ってください。
        当社はAI出力の正確性・完全性・適時性を保証しません。
      </p>
      <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-4">
        本サービスは「現状有姿」で提供され、特定目的への適合性・非侵害性・継続的稼働を保証しません。
      </p>

      {/* 8. 責任の制限 */}
      <h2 className="text-sm font-semibold tracking-[0.15em] uppercase text-[var(--text-primary)] mt-10 mb-3">
        8. 責任の制限
      </h2>
      <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-4">
        法令で認められる最大限の範囲において、当社の損害賠償責任は直接損害に限定され、
        損害発生前の直近1か月分の月額利用料金を上限とします。
        間接損害・逸失利益・データ損失については一切責任を負いません。
      </p>

      {/* 9. 準拠法・管轄 */}
      <h2 className="text-sm font-semibold tracking-[0.15em] uppercase text-[var(--text-primary)] mt-10 mb-3">
        9. 準拠法・管轄裁判所
      </h2>
      <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-4">
        本規約は日本法に準拠します。本サービスに関する紛争については、東京地方裁判所を第一審の専属的合意管轄裁判所とします。
      </p>

      {/* 10. GDPR準拠の苦情処理 */}
      <h2 className="text-sm font-semibold tracking-[0.15em] uppercase text-[var(--text-primary)] mt-10 mb-3">
        10. GDPR準拠の苦情処理
      </h2>
      <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-4">
        EU/EEA居住者は、データ保護に関する苦情をまず dpo@tascal.app へご連絡ください。
        当社の対応に不満がある場合は、お住まいの国のデータ保護監督機関（DPA）に申立を行う権利があります。
      </p>

      {/* 11. 改定手続き */}
      <h2 className="text-sm font-semibold tracking-[0.15em] uppercase text-[var(--text-primary)] mt-10 mb-3">
        11. 改定手続き
      </h2>
      <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-4">
        本規約を変更する場合は、施行の30日前までに登録メールアドレスへの通知またはサービス内での告知を行います。
        通知後も継続してご利用いただく場合、変更後の規約に同意したものとみなします。
      </p>

      {/* 12. お問い合わせ */}
      <h2 className="text-sm font-semibold tracking-[0.15em] uppercase text-[var(--text-primary)] mt-10 mb-3">
        12. お問い合わせ
      </h2>
      <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-4">
        本規約に関するご質問は privacy@tascal.app までお問い合わせください。
      </p>

      <div className="mt-12 pt-8 border-t border-[var(--border)] flex flex-wrap gap-4 text-xs text-[var(--text-subtle)]">
        <Link to="/privacy" className="hover:text-[var(--text-muted)]">プライバシーポリシー</Link>
        <Link to="/cookies" className="hover:text-[var(--text-muted)]">Cookie設定</Link>
        <Link to="/" className="hover:text-[var(--text-muted)]">ホームへ戻る</Link>
      </div>
    </div>
  );
}
