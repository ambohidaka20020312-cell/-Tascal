import { useState, FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../utils/api";
import { useAuthStore } from "../store/authStore";
import Button from "../components/common/Button";
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
          ?.response?.data?.error?.message ?? t('auth.login_error');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4">
      <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl p-8 w-full max-w-md">
        <div className="flex justify-end mb-2">
          <LanguageSwitcher />
        </div>
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-[var(--text-primary)] tracking-widest uppercase">TASCAL</h1>
          <p className="text-[var(--text-subtle)] text-sm mt-2 tracking-wide">AIがあなたの1日を最適化</p>
        </div>

        {error && (
          <div className="mb-6 p-3 border border-[var(--border)] rounded-lg text-sm text-[var(--text-muted)]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-semibold tracking-widest uppercase text-[var(--text-subtle)] mb-2">
              {t('auth.email')}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full border-0 border-b border-[var(--border)] rounded-none bg-transparent px-0 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold tracking-widest uppercase text-[var(--text-subtle)] mb-2">
              {t('auth.password')}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full border-0 border-b border-[var(--border)] rounded-none bg-transparent px-0 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full mt-2"
            loading={loading}
          >
            {t('auth.login')}
          </Button>
        </form>

        <p className="text-center text-sm text-[var(--text-subtle)] mt-8 tracking-wide">
          アカウントをお持ちでない方は{" "}
          <Link to="/register" className="text-[var(--text-primary)] hover:underline font-medium">
            {t('auth.register')}
          </Link>
        </p>
      </div>
    </div>
  );
}
