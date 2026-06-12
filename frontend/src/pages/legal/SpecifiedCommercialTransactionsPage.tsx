export default function SpecifiedCommercialTransactionsPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="max-w-2xl mx-auto px-5 py-12">
        <h1 className="text-lg font-semibold tracking-[0.1em] uppercase mb-8 text-[var(--text-primary)]">
          特定商取引法に基づく表記
        </h1>

        <table className="w-full text-sm border-collapse">
          <tbody>
            <Row label="販売業者" value="NutriAI" />
            <Row label="運営責任者" value="非公開（請求があれば遅滞なく開示します）" />
            <Row label="所在地" value={<>〒150-0043<br />東京都渋谷区道玄坂1丁目10番8号<br />渋谷道玄坂東急ビル2F-C</>} />
            <Row label="電話番号" value="非公開（下記メールにて受付後、遅滞なく開示します）" />
            <Row
              label="メールアドレス"
              value={
                <a
                  href="mailto:tascal.support@gmail.com"
                  className="underline underline-offset-2 text-[var(--text-muted)]"
                >
                  tascal.support@gmail.com
                </a>
              }
            />
            <Row label="サービス名" value="Tascal" />
            <Row
              label="販売価格"
              value={
                <>
                  <p>Freeプラン：無料</p>
                  <p className="mt-1">Proプラン：¥480／月（税込）または ¥4,800／年（税込）</p>
                  <p className="mt-1">Teamプラン：¥2,980／月（税込）または ¥29,800／年（税込）</p>
                </>
              }
            />
            <Row
              label="支払方法"
              value="クレジットカード（Visa / Mastercard / American Express / JCB）"
            />
            <Row
              label="支払時期"
              value="月払いは毎月の契約日に自動決済、年払いは契約時に一括決済"
            />
            <Row
              label="サービス提供時期"
              value="決済完了後、即時にご利用いただけます"
            />
            <Row
              label="返品・キャンセル"
              value={
                <>
                  <p>サブスクリプションはいつでもキャンセル可能です。</p>
                  <p className="mt-1">
                    キャンセル後は現在の契約期間終了日までご利用いただけます。
                    期間途中のご返金は原則として承っておりません。
                  </p>
                </>
              }
            />
            <Row
              label="動作環境"
              value="最新版のChrome / Safari / Firefox / Edge（インターネット接続必須）"
            />
            <Row
              label="お問い合わせ"
              value={
                <>
                  メールにてお問い合わせください。
                  <br />
                  <a
                    href="mailto:tascal.support@gmail.com"
                    className="underline underline-offset-2 text-[var(--text-muted)]"
                  >
                    tascal.support@gmail.com
                  </a>
                  <br />
                  <span className="text-xs text-[var(--text-subtle)]">
                    ※ 通常2営業日以内にご返信いたします
                  </span>
                </>
              }
            />
          </tbody>
        </table>

        <p className="mt-10 text-xs text-[var(--text-subtle)]">最終更新日：2026年6月5日</p>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <tr className="border-b border-[var(--border)]">
      <th className="py-4 pr-6 text-left align-top text-xs tracking-[0.1em] text-[var(--text-subtle)] font-normal whitespace-nowrap w-36">
        {label}
      </th>
      <td className="py-4 text-sm text-[var(--text-muted)] leading-relaxed">{value}</td>
    </tr>
  );
}
