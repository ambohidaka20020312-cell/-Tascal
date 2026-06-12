import { Link } from "react-router-dom";

interface CookieRow {
  name: string;
  purpose: string;
  expiry: string;
  provider: string;
}

interface CookieCategory {
  id: string;
  label: string;
  description: string;
  required: boolean;
  cookies: CookieRow[];
}

const COOKIE_CATEGORIES: CookieCategory[] = [
  {
    id: "essential",
    label: "必須Cookie",
    description:
      "本サービスの基本的な機能（ログイン状態の維持・セキュリティ）に必要なCookieです。これらを無効にするとサービスが正常に動作しない場合があります。同意は不要です。",
    required: true,
    cookies: [
      {
        name: "access_token",
        purpose: "JWTアクセストークン。認証状態の維持に使用。",
        expiry: "セッション終了時",
        provider: "tascal.app",
      },
      {
        name: "refresh_token",
        purpose: "JWTリフレッシュトークン。セッションの自動更新に使用。",
        expiry: "30日",
        provider: "tascal.app",
      },
      {
        name: "csrf_token",
        purpose: "クロスサイトリクエストフォージェリ（CSRF）攻撃の防止。",
        expiry: "セッション終了時",
        provider: "tascal.app",
      },
    ],
  },
  {
    id: "functional",
    label: "機能Cookie",
    description:
      "言語設定・テーマ設定など、ユーザーの利便性向上のためのCookieです。",
    required: false,
    cookies: [
      {
        name: "i18n_lang",
        purpose: "表示言語設定（日本語・英語など）の保存。",
        expiry: "1年",
        provider: "tascal.app",
      },
      {
        name: "theme",
        purpose: "ライト/ダークモードなどの表示テーマ設定の保存。",
        expiry: "1年",
        provider: "tascal.app",
      },
    ],
  },
  {
    id: "analytics",
    label: "分析Cookie",
    description:
      "サービスの改善を目的として、ページの閲覧状況や機能の利用状況を匿名で分析するCookieです。ご同意いただいた場合のみ使用します。",
    required: false,
    cookies: [
      {
        name: "_ga",
        purpose: "Google Analytics — ユーザー識別子（匿名）。",
        expiry: "2年",
        provider: "Google LLC",
      },
      {
        name: "_ga_*",
        purpose: "Google Analytics 4 — セッション状態の管理。",
        expiry: "2年",
        provider: "Google LLC",
      },
    ],
  },
  {
    id: "advertising",
    label: "広告Cookie",
    description:
      "Freeプランのユーザーに対してGoogle AdSenseによる広告を配信するために使用するCookieです。ご同意いただいた場合のみ使用します。Proプラン以上のユーザーには適用されません。",
    required: false,
    cookies: [
      {
        name: "__gads",
        purpose: "Google AdSense — 広告の表示・フリークエンシーキャップ管理。",
        expiry: "13か月",
        provider: "Google LLC",
      },
      {
        name: "__gpi",
        purpose: "Google AdSense — パブリッシャー識別子。",
        expiry: "13か月",
        provider: "Google LLC",
      },
      {
        name: "IDE",
        purpose: "Google DoubleClick — コンバージョントラッキングとリターゲティング広告。",
        expiry: "13か月",
        provider: "Google LLC",
      },
    ],
  },
];

function CookieTable({ cookies }: { cookies: CookieRow[] }) {
  return (
    <div className="overflow-x-auto mb-6">
      <table className="w-full text-xs text-[var(--text-muted)] border-collapse">
        <thead>
          <tr className="border-b border-[var(--border)]">
            <th className="text-left py-2 pr-4 font-semibold text-[var(--text-primary)] w-1/4">Cookie名</th>
            <th className="text-left py-2 pr-4 font-semibold text-[var(--text-primary)]">目的</th>
            <th className="text-left py-2 pr-4 font-semibold text-[var(--text-primary)] w-1/5">有効期限</th>
            <th className="text-left py-2 font-semibold text-[var(--text-primary)] w-1/5">提供元</th>
          </tr>
        </thead>
        <tbody>
          {cookies.map((c) => (
            <tr key={c.name} className="border-b border-[var(--border)] last:border-0">
              <td className="py-2 pr-4 font-mono">{c.name}</td>
              <td className="py-2 pr-4 leading-relaxed">{c.purpose}</td>
              <td className="py-2 pr-4">{c.expiry}</td>
              <td className="py-2">{c.provider}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function CookiePolicyPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-light tracking-wide text-[var(--text-primary)] mb-2">
        Cookie ポリシー
      </h1>
      <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-10">
        最終更新日: 2026年6月3日
      </p>

      <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-6">
        Tascalでは、サービスの提供・改善および広告配信のためにCookieおよび類似の技術を使用しています。
        本ページでは、使用するCookieの種類・目的・有効期限および設定の変更方法について説明します。
      </p>

      {/* Cookie一覧 */}
      {COOKIE_CATEGORIES.map((cat) => (
        <div key={cat.id}>
          <h2 className="text-sm font-semibold tracking-[0.15em] uppercase text-[var(--text-primary)] mt-10 mb-3">
            {cat.label}
            {cat.required && (
              <span className="ml-2 text-[10px] font-normal normal-case tracking-normal border border-[var(--border)] rounded px-1.5 py-0.5 text-[var(--text-subtle)]">
                常に有効
              </span>
            )}
          </h2>
          <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-4">
            {cat.description}
          </p>
          <CookieTable cookies={cat.cookies} />
        </div>
      ))}

      {/* 設定変更方法 */}
      <h2 className="text-sm font-semibold tracking-[0.15em] uppercase text-[var(--text-primary)] mt-10 mb-3">
        Cookie設定の変更方法
      </h2>
      <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-4">
        分析Cookie・広告Cookieの同意はいつでも撤回または変更できます。
      </p>
      <ul className="text-sm text-[var(--text-muted)] space-y-1 pl-4 list-disc mb-4">
        <li>
          <strong>Tascal内での設定</strong> — 設定ページ（
          <Link to="/settings" className="underline">設定</Link>
          ）の「プライバシー &amp; Cookie」セクションから変更できます。
        </li>
        <li>
          <strong>ブラウザの設定</strong> — ご利用のブラウザの設定からCookieを削除または無効化できます。
          ただし、必須Cookieを無効にするとサービスが正常に動作しない場合があります。
        </li>
        <li>
          <strong>Google広告の設定</strong> — Google のオプトアウトページ（
          <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer" className="underline">adssettings.google.com</a>
          ）からパーソナライズ広告をオプトアウトできます。
        </li>
      </ul>

      {/* 同意の撤回 */}
      <h2 className="text-sm font-semibold tracking-[0.15em] uppercase text-[var(--text-primary)] mt-10 mb-3">
        同意の撤回
      </h2>
      <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-4">
        EU/EEA居住者は、GDPRに基づきCookieへの同意をいつでも撤回する権利があります。
        同意の撤回は、撤回前に行われた処理の適法性には影響しません。
        ご質問は privacy@tascal.app またはDPO（dpo@tascal.app）までご連絡ください。
      </p>

      <div className="mt-12 pt-8 border-t border-[var(--border)] flex flex-wrap gap-4 text-xs text-[var(--text-subtle)]">
        <Link to="/privacy" className="hover:text-[var(--text-muted)]">プライバシーポリシー</Link>
        <Link to="/terms" className="hover:text-[var(--text-muted)]">利用規約</Link>
        <Link to="/" className="hover:text-[var(--text-muted)]">ホームへ戻る</Link>
      </div>
    </div>
  );
}
