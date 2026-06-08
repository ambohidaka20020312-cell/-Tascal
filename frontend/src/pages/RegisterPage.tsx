import { useState, FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../utils/api";
import { useAuthStore } from "../store/authStore";
import LanguageSwitcher from "../components/common/LanguageSwitcher";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);

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
    if (!ageConfirmed) {
      setError("13歳以上であることを確認してください");
      return;
    }
    if (!termsAccepted) {
      setError("利用規約とプライバシーポリシーへの同意が必要です");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/auth/register", { name, email, password, age_confirmed: true });
      const data = res.data.data ?? res.data;

      // メール確認フロー：トークンなしでメッセージのみ返る
      if (data?.access_token) {
        localStorage.setItem("access_token", data.access_token);
        localStorage.setItem("refresh_token", data.refresh_token);
        setUser(data.user);
        navigate("/app/tasks");
      } else {
        // 確認メール送信済み → メール確認案内ページへ
        navigate("/check-email", { state: { email } });
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? "登録に失敗しました。再度お試しください。";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[var(--bg-primary)]">
      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-[var(--bg-secondary)] border-r border-[var(--border)]">
        <span className="text-xs tracking-[0.3em] uppercase text-[var(--text-subtle)]">TASCAL</span>
        <div>
          <h1 className="text-5xl font-extralight tracking-[0.15em] text-[var(--text-primary)] leading-tight mb-4">
            Start for<br />free.
          </h1>
          <p className="text-sm text-[var(--text-muted)] tracking-wide leading-relaxed max-w-xs">
            AIがあなたの1日を最適化し、<br />本当に大切なことに集中できる環境を作ります。
          </p>
        </div>
        <ul className="space-y-3">
          {[
            "クレジットカード不要で無料スタート",
            "毎朝AIが今日の最適プランを提案",
            "タスク超過をリアルタイムで検知・再計画",
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
          <div className="ml-auto"><LanguageSwitcher /></div>
        </div>

        <div className="flex-1 flex items-center justify-center px-8 py-12">
          <div className="w-full max-w-sm">
            <h2 className="text-2xl font-light tracking-wide text-[var(--text-primary)] mb-1">
              アカウント作成
            </h2>
            <p className="text-xs text-[var(--text-muted)] tracking-wider mb-10">
              無料で始めるAIタスク管理
            </p>

            {error && (
              <p role="alert" className="text-xs text-[var(--text-muted)] border-l-2 border-[var(--border)] pl-3 mb-6 tracking-wide">
                {error}
              </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-6" noValidate>
              <div>
                <label htmlFor="reg-name" className="block text-[10px] tracking-[0.2em] uppercase text-[var(--text-subtle)] mb-3">
                  ニックネーム <span className="normal-case tracking-normal text-[var(--text-subtle)]">（任意）</span>
                </label>
                <input
                  id="reg-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="たろう"
                  className="w-full border-0 border-b border-[var(--border)] bg-transparent pb-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:border-[var(--text-primary)] transition-colors"
                />
              </div>

              <div>
                <label htmlFor="reg-email" className="block text-[10px] tracking-[0.2em] uppercase text-[var(--text-subtle)] mb-3">
                  メールアドレス
                </label>
                <input
                  id="reg-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full border-0 border-b border-[var(--border)] bg-transparent pb-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:border-[var(--text-primary)] transition-colors"
                />
              </div>

              <div>
                <label htmlFor="reg-password" className="block text-[10px] tracking-[0.2em] uppercase text-[var(--text-subtle)] mb-3">
                  パスワード
                </label>
                <input
                  id="reg-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="8文字以上"
                  required
                  className="w-full border-0 border-b border-[var(--border)] bg-transparent pb-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:border-[var(--text-primary)] transition-colors"
                />
              </div>

              <div>
                <label htmlFor="reg-confirm" className="block text-[10px] tracking-[0.2em] uppercase text-[var(--text-subtle)] mb-3">
                  パスワード（確認）
                </label>
                <input
                  id="reg-confirm"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full border-0 border-b border-[var(--border)] bg-transparent pb-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:border-[var(--text-primary)] transition-colors"
                />
              </div>

              <div className="space-y-3 pt-2">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ageConfirmed}
                    onChange={(e) => setAgeConfirmed(e.target.checked)}
                    className="mt-0.5 shrink-0 w-3.5 h-3.5 rounded border-[var(--border)] accent-[var(--accent)]"
                  />
                  <span className="text-xs text-[var(--text-muted)] leading-relaxed">
                    13歳以上です
                  </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-0.5 shrink-0 w-3.5 h-3.5 rounded border-[var(--border)] accent-[var(--accent)]"
                  />
                  <span className="text-xs text-[var(--text-muted)] leading-relaxed">
                    <Link to="/terms" target="_blank" className="underline underline-offset-2 hover:text-[var(--text-primary)]">利用規約</Link>
                    {" "}と{" "}
                    <Link to="/privacy" target="_blank" className="underline underline-offset-2 hover:text-[var(--text-primary)]">プライバシーポリシー</Link>
                    に同意します
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading || !ageConfirmed || !termsAccepted}
                className="w-full h-11 bg-[var(--text-primary)] text-[var(--bg-primary)] text-xs font-semibold tracking-[0.2em] uppercase rounded-lg hover:opacity-80 transition-opacity disabled:opacity-40"
              >
                {loading ? "..." : "無料で始める"}
              </button>
            </form>

            <p className="text-xs text-[var(--text-subtle)] mt-8 tracking-wide">
              すでにアカウントをお持ちの方は{" "}
              <Link to="/login" className="text-[var(--text-primary)] hover:underline">
                ログイン
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
