
import { Link } from "react-router-dom";

interface ErrorPageProps {
  code: number;
  message: string;
}

export default function ErrorPage({ code, message }: ErrorPageProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--bg-primary)] px-4">
      <span className="text-8xl font-extralight text-[var(--text-subtle)] mb-4 select-none">
        {code}
      </span>
      <p className="text-sm tracking-wide text-[var(--text-muted)] mb-8">
        {message}
      </p>
      <Link
        to="/"
        className="text-xs tracking-[0.2em] uppercase border border-[var(--border)] text-[var(--text-primary)] px-4 py-2 hover:bg-[var(--bg-secondary)] transition-colors"
      >
        ホームに戻る
      </Link>
    </div>
  );
}
