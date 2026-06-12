import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const appleSignIn = useAuthStore((s) => s.appleSignIn);

  const handleAppleSignIn = async () => {
    setError("");
    setLoading(true);
    try {
      await appleSignIn();
      navigate("/");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? "サインインに失敗しました。再度お試しください。";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-between bg-[var(--bg-primary)] px-8 py-16">
      {/* Top spacer */}
      <div />

      {/* Center content */}
      <div className="flex flex-col items-center gap-8 w-full max-w-xs">
        {/* Logo / name */}
        <div className="flex flex-col items-center gap-3">
          <span className="text-4xl font-extralight tracking-[0.25em] uppercase text-[var(--text-primary)]">
            TASCAL
          </span>
          <p className="text-sm text-[var(--text-muted)] tracking-wider text-center">
            AIがあなたの一日を最適化
          </p>
        </div>

        {/* Error message */}
        {error && (
          <p
            role="alert"
            className="text-xs text-[var(--text-muted)] border-l-2 border-[var(--border)] pl-3 tracking-wide w-full"
          >
            {error}
          </p>
        )}

        {/* Apple Sign-In button */}
        <button
          type="button"
          onClick={handleAppleSignIn}
          disabled={loading}
          aria-busy={loading}
          className="w-full h-14 flex items-center justify-center gap-3 bg-black text-white text-sm font-medium tracking-wide rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {/* Apple logo SVG */}
          {!loading && (
            <svg
              className="w-5 h-5"
              viewBox="0 0 814 1000"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 790.7 0 663 0 541.8c0-207.5 135.4-317.3 269-317.3 70.1 0 128.4 46.4 172.5 46.4 42.8 0 109.6-49.2 189.4-49.2zm-225.3-191.6c33.1-39.5 57.8-94.8 57.8-150.2 0-7.7-.6-15.4-1.9-21.8-55.3 2-120.5 36.9-160.6 83.4-31.3 35.7-60.9 91-60.9 147.1 0 8.3 1.3 16.6 1.9 19.2 3.2.6 8.4 1.3 13.6 1.3 49.9 0 112.7-32.5 149.1-78.3z" />
            </svg>
          )}
          {loading ? "..." : "Appleでサインイン"}
        </button>
      </div>

      {/* Privacy policy link */}
      <p className="text-[11px] text-[var(--text-subtle)] tracking-wide text-center">
        <a
          href="/privacy"
          className="underline underline-offset-2 hover:text-[var(--text-secondary)]"
        >
          プライバシーポリシー
        </a>
        {" "}および{" "}
        <a
          href="/terms"
          className="underline underline-offset-2 hover:text-[var(--text-secondary)]"
        >
          利用規約
        </a>
      </p>
    </div>
  );
}
