import { useState, FormEvent } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../utils/api";
import { useAuthStore } from "../store/authStore";
import LanguageSwitcher from "../components/common/LanguageSwitcher";

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ) : (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  );
}

export default function LoginPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendDone, setResendDone] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const resetDone = searchParams.get("reset") === "done";
  const setUser = useAuthStore((s) => s.setUser);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setErrorCode("");
    setLoading(true);
    try {
      const res = await api.post("/auth/login", { email, password });
      const { access_token, refresh_token, user } = res.data.data ?? res.data;
      localStorage.setItem("access_token", access_token);
      localStorage.setItem("refresh_token", refresh_token);
      setUser(user);
      navigate("/app/tasks");
    } catch (err: unknown) {
      const errData = (err as { response?: { data?: { error?: { code?: string; message?: string } } } })?.response?.data?.error;
      setErrorCode(errData?.code ?? "");
      setError(errData?.message ?? t("auth.login_error"));
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerify = async () => {
    if (!email) return;
    setResendLoading(true);
    try {
      await api.post("/auth/resend-verify", { email });
      setResendDone(true);
    } catch {
      setResendDone(true);
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[var(--bg-primary)]">
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-[var(--bg-secondary)] border-r border-[var(--border)]">
        <span className="text-xs tracking-[0.3em] uppercase text-[var(--text-subtle)]">TASCAL</span>
        <div>
          <h1 className="text-5xl font-extralight tracking-[0.15em] text-[var(--text-primary)] leading-tight mb-4">
            Focus on<br />what matters.
          </h1>
          <p className="text-sm text-[var(--text-muted)] tracking-wide leading-relaxed max-w-xs">
            AIがあなたの1日を最適化し、<br />本当に大切なことに集中できる環境を作ります。
          </p>
        </div>
        <ul className="space-y-3">
          {["毎朝AIが今日の最適プランを提案", "タスク超過をリアルタイムで検知・再計画", "週次インサイトで生産性の傾向を把握"].map((item) => (
            <li key={item} className="flex items-center gap-2 text-xs text-[var(--text-subtle)] tracking-wide">
              <span className="w-1 h-1 rounded-full bg-[var(--text-subtle)] shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="flex justify-between items-center px-8 pt-8">
          <span className="lg:hidden text-sm font-semibold tracking-[0.2em] uppercase text-[var(--text-primary)]">TASCAL</span>
          <div className="ml-auto"><LanguageSwitcher /></div>
        </div>

        <div className="flex-1 flex items-center justify-center px-8 py-12">
          <div className="w-full max-w-sm">
            <h2 className="text-2xl font-light tracking-wide text-[var(--text-primary)] mb-1">{t("auth.login")}</h2>
            <p className="text-xs text-[var(--text-muted)] tracking-wider mb-10">アカウントにサインイン</p>

            {resetDone && (
              <p className="text-xs text-emerald-500 border-l-2 border-emerald-500 pl-3 mb-6 tracking-wide">
                パスワードを更新しました。新しいパスワードでログインしてください。
              </p>
            )}

            {error && (
              <div id="login-error" role="alert" className="border-l-2 border-[var(--border)] pl-3 mb-6">
                <p className="text-xs text-[var(--text-muted)] tracking-wide">{error}</p>
                {errorCode === "EMAIL_NOT_VERIFIED" && (
                  <div className="mt-2">
                    {resendDone ? (
                      <p className="text-xs text-emerald-500 tracking-wide">確認メールを再送しました。</p>
                    ) : (
                      <button type="button" onClick={handleResendVerify} disabled={resendLoading}
                        className="text-xs text-[var(--text-secondary)] underline tracking-wide disabled:opacity-50">
                        {resendLoading ? "送信中..." : "確認メールを再送する"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8" noValidate>
              <div>
                <label htmlFor="login-email" className="block text-[10px] tracking-[0.2em] uppercase text-[var(--text-subtle)] mb-3">
                  {t("auth.email")}
                </label>
                <input
                  id="login-email" type="email" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com" required
                  className="w-full border-0 border-b border-[var(--border)] bg-transparent pb-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:border-[var(--text-primary)] transition-colors"
                />
              </div>

              <div>
                <label htmlFor="login-password" className="block text-[10px] tracking-[0.2em] uppercase text-[var(--text-subtle)] mb-3">
                  {t("auth.password")}
                </label>
                <div className="relative">
                  <input
                    id="login-password" type={showPassword ? "text" : "password"} value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••" required
                    className="w-full border-0 border-b border-[var(--border)] bg-transparent pb-2 pr-8 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:border-[var(--text-primary)] transition-colors"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-0 bottom-2 text-[var(--text-subtle)] hover:text-[var(--text-secondary)]"
                    aria-label={showPassword ? "パスワードを隠す" : "パスワードを表示"}>
                    <EyeIcon open={showPassword} />
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} aria-busy={loading}
                className="w-full h-11 bg-[var(--text-primary)] text-[var(--bg-primary)] text-xs font-semibold tracking-[0.2em] uppercase rounded-lg hover:opacity-80 transition-opacity disabled:opacity-40">
                {loading ? "..." : t("auth.login")}
              </button>
            </form>

            <div className="mt-8 space-y-3">
              <p className="text-xs text-[var(--text-subtle)] tracking-wide">
                <Link to="/forgot-password" className="text-[var(--text-primary)] hover:underline">パスワードをお忘れの方</Link>
              </p>
              <p className="text-xs text-[var(--text-subtle)] tracking-wide">
                <Link to="/resend-verify" className="text-[var(--text-primary)] hover:underline">確認メールが届かなかった方</Link>
              </p>
              <p className="text-xs text-[var(--text-subtle)] tracking-wide">
                アカウントをお持ちでない方は{" "}
                <Link to="/register" className="text-[var(--text-primary)] hover:underline">{t("auth.register")}</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
