import { useState, FormEvent } from "react";
import { Link } from "react-router-dom";
import api from "../utils/api";

export default function ResendVerifyPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setError("");
    setLoading(true);
    try {
      await api.post("/auth/resend-verify", { email: email.trim() });
      setDone(true);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message ?? "送信に失敗しました。しばらくしてから再試行してください。";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] px-4">
      <div className="w-full max-w-sm">
        <p className="text-[10px] tracking-[0.3em] uppercase text-[var(--text-subtle)] mb-8">TASCAL</p>

        {done ? (
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-[var(--bg-secondary)] border border-[var(--border)] flex items-center justify-center mx-auto mb-6">
              <svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-light tracking-wide text-[var(--text-primary)] mb-3">送信しました</h2>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-8">
              確認メールを再送しました。<br />
              メール内のリンクをクリックして<br />
              アカウントを有効化してください。
            </p>
            <Link to="/login" className="text-xs text-[var(--text-subtle)] underline tracking-wide hover:text-[var(--text-secondary)]">
              ログインページへ
            </Link>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-light tracking-wide text-[var(--text-primary)] mb-2">確認メールの再送</h2>
            <p className="text-xs text-[var(--text-muted)] tracking-wide leading-relaxed mb-10">
              登録したメールアドレスを入力してください。<br />
              確認メールを再送します。
            </p>

            {error && (
              <p role="alert" className="text-xs text-[var(--text-muted)] border-l-2 border-[var(--border)] pl-3 mb-6 tracking-wide">
                {error}
              </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-8" noValidate>
              <div>
                <label htmlFor="resend-email" className="block text-[10px] tracking-[0.2em] uppercase text-[var(--text-subtle)] mb-3">
                  メールアドレス
                </label>
                <input
                  id="resend-email" type="email" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com" required
                  className="w-full border-0 border-b border-[var(--border)] bg-transparent pb-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:border-[var(--text-primary)] transition-colors"
                />
              </div>

              <button type="submit" disabled={loading || !email.trim()}
                className="w-full h-11 bg-[var(--text-primary)] text-[var(--bg-primary)] text-xs font-semibold tracking-[0.2em] uppercase rounded-lg hover:opacity-80 transition-opacity disabled:opacity-40">
                {loading ? "送信中..." : "確認メールを再送する"}
              </button>
            </form>

            <p className="text-xs text-[var(--text-subtle)] mt-8 tracking-wide">
              <Link to="/login" className="text-[var(--text-primary)] hover:underline">ログインページへ戻る</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
