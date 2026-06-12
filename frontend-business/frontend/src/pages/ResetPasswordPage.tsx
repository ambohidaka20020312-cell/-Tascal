import { useState, FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../utils/api";
import LanguageSwitcher from "../components/common/LanguageSwitcher";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("パスワードが一致しません");
      return;
    }
    if (password.length < 8) {
      setError("パスワードは8文字以上で設定してください");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, password });
      navigate("/login?reset=done");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? "エラーが発生しました。リンクの有効期限が切れている可能性があります。";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="text-center space-y-4">
          <p className="text-sm text-[var(--text-muted)]">無効なリンクです。</p>
          <Link to="/forgot-password" className="text-xs text-[var(--text-primary)] underline">
            パスワードリセットをやり直す
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[var(--bg-primary)]">
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-[var(--bg-secondary)] border-r border-[var(--border)]">
        <span className="text-xs tracking-[0.3em] uppercase text-[var(--text-subtle)]">TASCAL</span>
        <div>
          <h1 className="text-5xl font-extralight tracking-[0.15em] text-[var(--text-primary)] leading-tight mb-4">
            New<br />password.
          </h1>
          <p className="text-sm text-[var(--text-muted)] tracking-wide leading-relaxed max-w-xs">
            8文字以上で新しいパスワードを設定してください。
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
            <h2 className="text-2xl font-light tracking-wide text-[var(--text-primary)] mb-1">
              新しいパスワード
            </h2>
            <p className="text-xs text-[var(--text-muted)] tracking-wider mb-10">
              8文字以上で設定してください
            </p>

            {error && (
              <p role="alert" className="text-xs text-[var(--text-muted)] border-l-2 border-[var(--border)] pl-3 mb-6 tracking-wide">
                {error}
              </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-8" noValidate>
              <div>
                <label htmlFor="reset-password" className="block text-[10px] tracking-[0.2em] uppercase text-[var(--text-subtle)] mb-3">
                  新しいパスワード
                </label>
                <input
                  id="reset-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="8文字以上"
                  required
                  className="w-full border-0 border-b border-[var(--border)] bg-transparent pb-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:border-[var(--text-primary)] transition-colors"
                />
              </div>

              <div>
                <label htmlFor="reset-confirm" className="block text-[10px] tracking-[0.2em] uppercase text-[var(--text-subtle)] mb-3">
                  確認
                </label>
                <input
                  id="reset-confirm"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full border-0 border-b border-[var(--border)] bg-transparent pb-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:border-[var(--text-primary)] transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-[var(--text-primary)] text-[var(--bg-primary)] text-xs font-semibold tracking-[0.2em] uppercase rounded-lg hover:opacity-80 transition-opacity disabled:opacity-40"
              >
                {loading ? "..." : "パスワードを更新する"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
