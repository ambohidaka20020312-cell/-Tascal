import { Link } from "react-router-dom";

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-light tracking-wide text-[var(--text-primary)] mb-2">
        プライバシーポリシー
      </h1>
      <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-10">
        最終更新日: 2026年6月3日
      </p>

      {/* 1. 事業者情報 */}
      <h2 className="text-sm font-semibold tracking-[0.15em] uppercase text-[var(--text-primary)] mt-10 mb-3">
        1. 事業者情報
      </h2>
      <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-4">
        本プライバシーポリシーは、以下の事業者が提供するタスク管理サービス「Tascal」に適用されます。
      </p>
      <ul className="text-sm text-[var(--text-muted)] space-y-1 pl-4 list-disc mb-4">
        <li>サービス名: Tascal</li>
        <li>運営: [会社名]</li>
        <li>プライバシーに関するお問い合わせ: privacy@tascal.app</li>
        <li>データ保護責任者（DPO）: dpo@tascal.app</li>
      </ul>

      {/* 2. 収集する個人情報 */}
      <h2 className="text-sm font-semibold tracking-[0.15em] uppercase text-[var(--text-primary)] mt-10 mb-3">
        2. 収集する個人情報
      </h2>
      <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-4">
        当社は、サービス提供にあたり以下の個人情報を収集します。
      </p>
      <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-2 font-medium">
        アカウント情報
      </p>
      <ul className="text-sm text-[var(--text-muted)] space-y-1 pl-4 list-disc mb-4">
        <li>氏名</li>
        <li>メールアドレス</li>
        <li>パスワード（ハッシュ化して保存）</li>
      </ul>
      <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-2 font-medium">
        利用データ
      </p>
      <ul className="text-sm text-[var(--text-muted)] space-y-1 pl-4 list-disc mb-4">
        <li>タスク情報（タイトル・説明・優先度・完了状況）</li>
        <li>AI機能の使用履歴・最適化ログ</li>
        <li>サービス内での行動履歴</li>
      </ul>
      <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-2 font-medium">
        決済情報
      </p>
      <ul className="text-sm text-[var(--text-muted)] space-y-1 pl-4 list-disc mb-4">
        <li>決済処理はStripe, Inc.が行い、当社はカード番号等の決済情報を保持しません</li>
        <li>Stripeが発行するカスタマーIDおよびサブスクリプションIDのみ保存します</li>
      </ul>
      <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-2 font-medium">
        技術情報
      </p>
      <ul className="text-sm text-[var(--text-muted)] space-y-1 pl-4 list-disc mb-4">
        <li>IPアドレス</li>
        <li>デバイス情報（OS・ブラウザ・画面サイズ）</li>
        <li>Cookie・類似技術によるデータ（詳細は「9. Cookie」をご参照ください）</li>
        <li>アクセスログ・エラーログ</li>
      </ul>

      {/* 3. 利用目的 */}
      <h2 className="text-sm font-semibold tracking-[0.15em] uppercase text-[var(--text-primary)] mt-10 mb-3">
        3. 利用目的
      </h2>
      <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-4">
        収集した個人情報は、以下の目的のために利用します。
      </p>
      <ul className="text-sm text-[var(--text-muted)] space-y-1 pl-4 list-disc mb-4">
        <li>サービスの提供・運営・改善</li>
        <li>AIタスク最適化機能の提供（タスクデータをAIモデルに送信する場合があります）</li>
        <li>サブスクリプションの管理および決済処理</li>
        <li>カスタマーサポートへの対応</li>
        <li>不正アクセスの検知・防止</li>
        <li>法的義務の履行</li>
        <li>サービスに関する重要なお知らせの送信</li>
      </ul>

      {/* 4. 第三者提供 */}
      <h2 className="text-sm font-semibold tracking-[0.15em] uppercase text-[var(--text-primary)] mt-10 mb-3">
        4. 第三者提供・データ移転
      </h2>
      <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-4">
        当社は、以下の第三者にデータを提供または処理を委託する場合があります。
      </p>
      <ul className="text-sm text-[var(--text-muted)] space-y-1 pl-4 list-disc mb-4">
        <li>
          <strong>Stripe, Inc.</strong>（米国）— 決済処理。
          <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="underline ml-1">Stripe プライバシーポリシー</a>
        </li>
        <li>
          <strong>Anthropic, PBC</strong>（米国）— AIタスク最適化処理。タスクデータが含まれる場合があります。
          APIはUSサーバーを使用し、EUからのデータ移転はEU標準契約条項（SCC）に基づいて行われます。
          <a href="https://www.anthropic.com/privacy" target="_blank" rel="noopener noreferrer" className="underline ml-1">Anthropic プライバシーポリシー</a>
        </li>
        <li>
          <strong>Google LLC</strong>（米国）— Freeプランユーザーへの広告配信（Google AdSense）。
          <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="underline ml-1">Google プライバシーポリシー</a>
        </li>
      </ul>
      <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-4">
        法令に基づく場合、またはユーザーの同意がある場合を除き、上記以外の第三者に個人情報を提供することはありません。
        当社は個人情報を販売しません。
      </p>

      {/* 5. GDPR権利 */}
      <h2 className="text-sm font-semibold tracking-[0.15em] uppercase text-[var(--text-primary)] mt-10 mb-3">
        5. GDPR権利（EU/EEA居住者）
      </h2>
      <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-4">
        EU一般データ保護規則（GDPR）に基づき、EU/EEA居住者の方は以下の権利を有します。
      </p>
      <ul className="text-sm text-[var(--text-muted)] space-y-1 pl-4 list-disc mb-4">
        <li><strong>アクセス権</strong> — 当社が保有するあなたの個人データへのアクセスを請求する権利</li>
        <li><strong>訂正権</strong> — 不正確な個人データの訂正を請求する権利</li>
        <li><strong>削除権（忘れられる権利）</strong> — 一定の条件下で個人データの削除を請求する権利</li>
        <li><strong>処理制限権</strong> — 個人データの処理を制限するよう請求する権利</li>
        <li><strong>データポータビリティ権</strong> — 構造化された機械可読形式でデータを受け取る権利</li>
        <li><strong>異議申立権</strong> — 正当な利益または公共の利益に基づく処理に異議を申し立てる権利</li>
        <li><strong>自動化された意思決定に関する権利</strong> — プロファイリングを含む自動化された意思決定の対象とならない権利</li>
        <li><strong>監督機関への申立権</strong> — お住まいの国のデータ保護当局に申立を行う権利</li>
      </ul>
      <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-4">
        これらの権利を行使するには、dpo@tascal.app までご連絡ください。
        処理の法的根拠はサービス契約の履行（GDPR第6条1項b）、正当な利益（同f）および同意（同a）です。
      </p>

      {/* 6. CCPA権利 */}
      <h2 className="text-sm font-semibold tracking-[0.15em] uppercase text-[var(--text-primary)] mt-10 mb-3">
        6. CCPA権利（カリフォルニア州居住者）
      </h2>
      <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-4">
        カリフォルニア州消費者プライバシー法（CCPA）に基づき、カリフォルニア州居住者の方は以下の権利を有します。
      </p>
      <ul className="text-sm text-[var(--text-muted)] space-y-1 pl-4 list-disc mb-4">
        <li><strong>開示請求権</strong> — 収集した個人情報の種類・目的・提供先の開示を請求する権利</li>
        <li><strong>削除請求権</strong> — 収集した個人情報の削除を請求する権利</li>
        <li><strong>オプトアウト権</strong> — 当社はカリフォルニア州法上の「個人情報の販売」を行っていません</li>
        <li><strong>差別されない権利</strong> — 権利行使を理由に差別的な取扱いを受けない権利</li>
      </ul>
      <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-4">
        これらの権利を行使するには、privacy@tascal.app までご連絡ください。
        認証済みの代理人を通じた請求も受け付けます。
      </p>

      {/* 7. その他の地域の法律 */}
      <h2 className="text-sm font-semibold tracking-[0.15em] uppercase text-[var(--text-primary)] mt-10 mb-3">
        7. その他の地域に適用される法律
      </h2>
      <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-4">
        当社は以下の法律を遵守します。
      </p>
      <ul className="text-sm text-[var(--text-muted)] space-y-1 pl-4 list-disc mb-4">
        <li><strong>APPI（日本）</strong> — 個人情報の保護に関する法律。個人情報保護委員会の指針に従います。</li>
        <li><strong>PDPA（韓国）</strong> — 個人情報保護法。韓国居住者のデータは同法の要件に従って処理します。</li>
        <li><strong>PIPL（中国）</strong> — 個人情報保護法。中国本土居住者のデータは現地法の要件を遵守します。</li>
        <li><strong>LGPD（ブラジル）</strong> — 一般データ保護法。ブラジル居住者はLGPDに定める権利を行使できます。</li>
      </ul>

      {/* 8. データ保存期間 */}
      <h2 className="text-sm font-semibold tracking-[0.15em] uppercase text-[var(--text-primary)] mt-10 mb-3">
        8. データ保存期間
      </h2>
      <ul className="text-sm text-[var(--text-muted)] space-y-1 pl-4 list-disc mb-4">
        <li>アカウントデータ: 退会後30日以内に削除</li>
        <li>バックアップデータ: 退会後最大90日で完全削除</li>
        <li>法令上の保存義務がある場合は、当該期間中保存します</li>
      </ul>

      {/* 9. Cookie */}
      <h2 className="text-sm font-semibold tracking-[0.15em] uppercase text-[var(--text-primary)] mt-10 mb-3">
        9. Cookie
      </h2>
      <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-4">
        当社は以下のCookieを使用します。詳細は
        <Link to="/cookies" className="underline ml-1">Cookie ポリシー</Link>
        をご参照ください。
      </p>
      <ul className="text-sm text-[var(--text-muted)] space-y-1 pl-4 list-disc mb-4">
        <li><strong>必須Cookie</strong> — セッション管理・認証。サービス提供に必要なため同意不要。</li>
        <li><strong>分析Cookie</strong> — サービス改善目的。ご同意いただいた場合のみ使用。</li>
        <li><strong>広告Cookie</strong> — Freeプランユーザーへの広告配信（Google AdSense）。ご同意いただいた場合のみ使用。</li>
      </ul>

      {/* 10. 未成年者 */}
      <h2 className="text-sm font-semibold tracking-[0.15em] uppercase text-[var(--text-primary)] mt-10 mb-3">
        10. 未成年者のご利用について
      </h2>
      <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-4">
        本サービスは13歳未満の方のご利用を禁じています（COPPA準拠）。
        EU/EEA居住者については、GDPRの第8条に基づき16歳未満の方はご利用いただけません。
        該当年齢未満のユーザーと判明した場合、アカウントおよびデータを速やかに削除します。
      </p>

      {/* 11. 改定 */}
      <h2 className="text-sm font-semibold tracking-[0.15em] uppercase text-[var(--text-primary)] mt-10 mb-3">
        11. 本ポリシーの改定
      </h2>
      <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-4">
        本ポリシーを重要な内容で改定する場合は、施行30日前までに登録メールアドレスへの通知またはサービス内での告知を行います。
        改定後も継続してご利用いただく場合、新しいポリシーに同意したものとみなします。
      </p>

      {/* 12. お問い合わせ */}
      <h2 className="text-sm font-semibold tracking-[0.15em] uppercase text-[var(--text-primary)] mt-10 mb-3">
        12. お問い合わせ
      </h2>
      <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-4">
        本ポリシーに関するご質問・ご意見、または権利行使のご請求は以下までお問い合わせください。
      </p>
      <ul className="text-sm text-[var(--text-muted)] space-y-1 pl-4 list-disc mb-4">
        <li>一般的なプライバシーに関するお問い合わせ: privacy@tascal.app</li>
        <li>データ保護責任者（DPO / GDPR関連）: dpo@tascal.app</li>
      </ul>

      <div className="mt-12 pt-8 border-t border-[var(--border)] flex flex-wrap gap-4 text-xs text-[var(--text-subtle)]">
        <Link to="/terms" className="hover:text-[var(--text-muted)]">利用規約</Link>
        <Link to="/cookies" className="hover:text-[var(--text-muted)]">Cookie設定</Link>
        <Link to="/" className="hover:text-[var(--text-muted)]">ホームへ戻る</Link>
      </div>
    </div>
  );
}
