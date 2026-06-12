import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import api from "../utils/api";

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) { setStatus("error"); setMessage("トークンが無効です"); return; }
    api.get(`/auth/verify-email?token=${token}`)
      .then(() => setStatus("success"))
      .catch((err) => {
        setStatus("error");
        setMessage(err?.response?.data?.error?.message ?? "認証に失敗しました");
      });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
      <div className="text-center px-6 max-w-sm">
        {status === "loading" && (
          <div className="w-10 h-10 border-2 border-[var(--border)] border-t-[var(--text-primary)] rounded-full animate-spin mx-auto" />
        )}
        {status === "success" && (
          <>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-xl font-light text-[var(--text-primary)] mb-2">メールアドレスを確認しました</h1>
            <p className="text-sm text-[var(--text-muted)] mb-8">アカウントが有効化されました。ログインしてください。</p>
            <Link to="/login"
              className="inline-block w-full h-11 bg-[var(--text-primary)] text-[var(--bg-primary)] text-xs font-semibold tracking-[0.2em] uppercase rounded-lg hover:opacity-80 transition-opacity leading-[44px]">
              ログインする
            </Link>
          </>
        )}
        {status === "error" && (
          <>
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-xl font-light text-[var(--text-primary)] mb-2">認証に失敗しました</h1>
            <p className="text-sm text-[var(--text-muted)] mb-8">{message || "リンクの有効期限が切れているか無効です。"}</p>
            <Link to="/resend-verify" className="text-sm text-[var(--text-primary)] hover:underline">
              確認メールを再送する
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
