import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
      <div className="text-center space-y-6">
        <p className="text-[10px] tracking-[0.3em] uppercase text-[var(--text-subtle)]">404</p>
        <h1 className="text-3xl font-light tracking-wide text-[var(--text-primary)]">
          ページが見つかりません
        </h1>
        <p className="text-sm text-[var(--text-muted)]">
          URLを確認するか、ホームに戻ってください。
        </p>
        <Link
          to="/"
          className="inline-block mt-4 h-10 px-8 bg-[var(--text-primary)] text-[var(--bg-primary)] text-xs font-semibold tracking-[0.2em] uppercase rounded-lg hover:opacity-80 transition-opacity leading-10"
        >
          ホームへ戻る
        </Link>
      </div>
    </div>
  );
}
