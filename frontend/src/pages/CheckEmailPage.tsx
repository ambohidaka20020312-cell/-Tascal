import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../utils/api";

export default function CheckEmailPage() {
  const { state } = useLocation() as { state?: { email?: string } };
  const navigate = useNavigate();
  const email = state?.email ?? "";
  const [resendLoading, setResendLoading] = useState(false);
  const [resendDone, setResendDone] = useState(false);

  const handleResend = async () => {
    if (!email || resendLoading) return;
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
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] px-4">
      <div className="max-w-md w-full text-center">

        {/* アイコン */}
        <div className="w-20 h-20 rounded-full bg-[var(--bg-secondary)] border border-[var(--border)] flex items-center justify-center mx-auto mb-8">
          <svg className="w-9 h-9 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>

        {/* テキスト */}
        <p className="text-[10px] tracking-[0.3em] uppercase text-[var(--text-subtle)] mb-4">TASCAL</p>
        <h1 className="text-2xl font-light tracking-wide text-[var(--text-primary)] mb-3">
          メールをご確認ください
        </h1>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-2">
          確認メールを送信しました。
        </p>
        {email && (
          <p className="text-sm font-medium text-[var(--text-primary)] mb-6 tracking-wide">
            {email}
          </p>
        )}
        <p className="text-xs text-[var(--text-muted)] leading-relaxed mb-10">
          メール内の「メールアドレスを確認する」ボタンを<br />
          クリックするとアカウントが有効化されます。<br />
          有効期限は <strong>24時間</strong> です。
        </p>

        {/* 再送信 */}
        <div className="mb-8">
          {resendDone ? (
            <p className="text-xs text-emerald-500 tracking-wide">再送しました。メールをご確認ください。</p>
          ) : (
            <button
              onClick={handleResend}
              disabled={resendLoading || !email}
              className="text-xs text-[var(--text-secondary)] underline tracking-wide disabled:opacity-40"
            >
              {resendLoading ? "送信中..." : "メールが届かない場合は再送する"}
            </button>
          )}
        </div>

        {/* ログインへ */}
        <button
          onClick={() => navigate("/login")}
          className="text-xs text-[var(--text-subtle)] tracking-wide hover:text-[var(--text-secondary)]"
        >
          ログインページへ戻る
        </button>
      </div>
    </div>
  );
}
