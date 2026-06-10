import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { useAcceptInvite } from "../hooks/useOrg";

export default function JoinTeamPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const acceptInvite = useAcceptInvite();
  const [status, setStatus] = useState<"loading" | "success" | "error" | "login_required">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("招待リンクが無効です");
      return;
    }
    if (!isAuthenticated()) {
      setStatus("login_required");
      return;
    }
    acceptInvite.mutate(token, {
      onSuccess: (res) => {
        const orgName = (res.data as { data?: { org_name?: string } }).data?.org_name ?? "チーム";
        setMessage(`${orgName}に参加しました`);
        setStatus("success");
        setTimeout(() => navigate("/app/team"), 2000);
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? "招待リンクが無効または期限切れです";
        setMessage(msg);
        setStatus("error");
      },
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] px-4">
      <div className="w-full max-w-sm text-center space-y-4">
        <span className="text-xs tracking-[0.3em] uppercase text-[var(--text-subtle)]">TASCAL</span>

        {status === "loading" && (
          <>
            <div className="w-10 h-10 border-2 border-[var(--border)] border-t-[var(--text-primary)] rounded-full animate-spin mx-auto" />
            <p className="text-sm text-[var(--text-secondary)]">チームへの参加を処理中...</p>
          </>
        )}

        {status === "login_required" && (
          <>
            <h2 className="text-lg font-light text-[var(--text-primary)]">チームに参加するにはログインが必要です</h2>
            <div className="space-y-2">
              <Link
                to={`/login?next=${encodeURIComponent(`/join-team?token=${token}`)}`}
                className="block w-full py-2.5 text-sm font-medium bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-lg hover:opacity-80 transition-opacity"
              >
                ログイン
              </Link>
              <Link
                to={`/register?invite=${token}`}
                className="block w-full py-2.5 text-sm font-medium border border-[var(--border)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
              >
                新規登録して参加
              </Link>
            </div>
          </>
        )}

        {status === "success" && (
          <>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-[var(--text-primary)] font-medium">{message}</p>
            <p className="text-xs text-[var(--text-muted)]">チームページに移動します...</p>
          </>
        )}

        {status === "error" && (
          <>
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-[var(--text-primary)] font-medium">{message}</p>
            <Link to="/app/tasks" className="text-xs text-[var(--text-muted)] underline">
              トップに戻る
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
