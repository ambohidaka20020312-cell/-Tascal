import { useState, FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../utils/api";
import { useAuthStore } from "../store/authStore";
import LanguageSwitcher from "../components/common/LanguageSwitcher";

export default function LoginPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/auth/login", { email, password });
      const { access_token, refresh_token, user } = res.data.data ?? res.data;
      localStorage.setItem("access_token", access_token);
      localStorage.setItem("refresh_token", refresh_token);
      setUser(user);
      navigate("/");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? t("auth.login_error");
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[var(--bg-primary)]">
      {/* Left brand panel — hidden on mobile */}
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
          {[
            "毎朝AIが今日の最適プランを提案",
            "タスク超過をリアルタイムで検知・再計画",
            "週次インサイトで生産性の傾向を把握",
          ].map((item) => (
            <li key={item} className="flex items-center gap-2 text-xs text-[var(--text-subtle)] tracking-wide">
              <span className="w-1 h-1 rounded-full bg-[var(--text-subtle)] shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col">
        <div className="flex justify-between items-center px-8 pt-8">
          <span className="lg:hidden text-sm font-semibold tracking-[0.2em] uppercase text-[var(--text-primary)]">TASCAL</span>
          <div className="ml-auto">
            <LanguageSwitcher />
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center px-8 py-12">
          <div className="w-full max-w-sm">
            <h2 className="text-2xl font-light tracking-wide text-[var(--text-primary)] mb-1">
              {t("auth.login")}
            </h2>
            <p className="text-xs text-[var(--text-muted)] tracking-wider mb-10">
              アカウントにサインイン
            </p>

            {error && (
              <p
                id="login-error"
                role="alert"
                className="text-xs text-[var(--text-muted)] border-l-2 border-[var(--border)] pl-3 mb-6 tracking-wide"
              >
                {error}
              </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-8" noValidate>
              <div>
                <label
                  htmlFor="login-email"
                  className="block text-[10px] tracking-[0.2em] uppercase text-[var(--text-subtle)] mb-3"
                >
                  {t("auth.email")}
                </label>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  aria-invalid={error ? "true" : "false"}
                  aria-describedby={error ? "login-error" : undefined}
                  className="w-full border-0 border-b border-[var(--border)] bg-transparent pb-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:border-[var(--text-primary)] transition-colors"
                />
              </div>

              <div>
                <label
                  htmlFor="login-password"
                  className="block text-[10px] tracking-[0.2em] uppercase text-[var(--text-subtle)] mb-3"
                >
                  {t("auth.password")}
                </label>
                <input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  aria-invalid={error ? "true" : "false"}
                  aria-describedby={error ? "login-error" : undefined}
                  className="w-full border-0 border-b border-[var(--border)] bg-transparent pb-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:border-[var(--text-primary)] transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                aria-busy={loading}
                className="w-full h-11 bg-[var(--text-primary)] text-[var(--bg-primary)] text-xs font-semibold tracking-[0.2em] uppercase rounded-lg hover:opacity-80 transition-opacity disabled:opacity-40"
              >
                {loading ? "..." : t("auth.login")}
              </button>
            </form>

            <p className="text-xs text-[var(--text-subtle)] mt-8 tracking-wide">
              アカウントをお持ちでない方は{" "}
              <Link to="/register" className="text-[var(--text-primary)] hover:underline">
                {t("auth.register")}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
