import { useState, FormEvent } from "react";
import { Link } from "react-router-dom";
import api from "../utils/api";
import LanguageSwitcher from "../components/common/LanguageSwitcher";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setSent(true);
    } catch {
      setError("送信に失敗しました。しばらくしてから再度お試しください。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[var(--bg-primary)]">
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-[var(--bg-secondary)] border-r border-[var(--border)]">
        <span className="text-xs tracking-[0.3em] uppercase text-[var(--text-subtle)]">TASCAL</span>
        <div>
          <h1 className="text-5xl font-extralight tracking-[0.15em] text-[var(--text-primary)] leading-tight mb-4">
            Reset your<br />password.
          </h1>
          <p className="text-sm text-[var(--text-muted)] tracking-wide leading-relaxed max-w-xs">
            登録済みのメールアドレスに<br />リセット用リンクをお送りします。
          </p>
        </div>
        <span />
      </div>

      <div className="flex-1 flex flex-col">
        <div className="flex justify-between items-center px-8 pt-8">
          <span className="lg:hidden text-sm font-semibold tracking-[0.2em] uppercase text-[var(--text-primary)]">TASCAL</span>
          <div className="ml-auto"><LanguageSwitcher /></div>
        </div>

        <div className="flex-1 flex items-center justify-center px-8 py-12">
          <div className="w-full max-w-sm">
            {sent ? (
              <div className="space-y-6">
                <h2 className="text-2xl font-light tracking-wide text-[var(--text-primary)]">
                  メールを送信しました
                </h2>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                  登録済みのアドレスにパスワードリセットのリンクをお送りしました。
                  メールが届かない場合は迷惑メールフォルダをご確認ください。
                </p>
                <Link
                  to="/login"
                  className="block text-xs text-[var(--text-subtle)] hover:text-[var(--text-primary)] transition-colors tracking-wide underline underline-offset-4"
                >
                  ログインに戻る
                </Link>
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-light tracking-wide text-[var(--text-primary)] mb-1">
                  パスワードリセット
                </h2>
                <p className="text-xs text-[var(--text-muted)] tracking-wider mb-10">
                  登録済みのメールアドレスを入力してください
                </p>

                {error && (
                  <p role="alert" className="text-xs text-[var(--text-muted)] border-l-2 border-[var(--border)] pl-3 mb-6 tracking-wide">
                    {error}
                  </p>
                )}

                <form onSubmit={handleSubmit} className="space-y-8" noValidate>
                  <div>
                    <label htmlFor="forgot-email" className="block text-[10px] tracking-[0.2em] uppercase text-[var(--text-subtle)] mb-3">
                      メールアドレス
                    </label>
                    <input
                      id="forgot-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      className="w-full border-0 border-b border-[var(--border)] bg-transparent pb-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:border-[var(--text-primary)] transition-colors"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-11 bg-[var(--text-primary)] text-[var(--bg-primary)] text-xs font-semibold tracking-[0.2em] uppercase rounded-lg hover:opacity-80 transition-opacity disabled:opacity-40"
                  >
                    {loading ? "..." : "送信する"}
                  </button>
                </form>

                <p className="text-xs text-[var(--text-subtle)] mt-8 tracking-wide">
                  <Link to="/login" className="text-[var(--text-primary)] hover:underline">
                    ログインに戻る
                  </Link>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
