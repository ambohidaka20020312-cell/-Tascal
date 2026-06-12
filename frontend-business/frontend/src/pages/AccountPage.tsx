import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import { useAuthStore } from "../store/authStore";

export default function AccountPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const [exporting, setExporting] = useState(false);
  const [optingOut, setOptingOut] = useState(false);
  const [optedOut, setOptedOut] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteEmail, setDeleteEmail] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await api.get("/account/data-export", { responseType: "blob" });
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "tascal-data-export.json";
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const handleOptOut = async () => {
    setOptingOut(true);
    try {
      await api.post("/account/opt-out-analytics");
      setOptedOut(true);
    } finally {
      setOptingOut(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteEmail !== user?.email) {
      setDeleteError("メールアドレスが一致しません");
      return;
    }
    setDeleteError("");
    setDeleting(true);
    try {
      await api.delete("/account");
      logout();
      navigate("/login");
    } catch {
      setDeleteError("削除に失敗しました。再度お試しください。");
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-8 py-6">
      <h1 className="text-xl font-semibold text-[var(--text-primary)] tracking-wide">
        アカウント管理
      </h1>

      {/* 1. Data export */}
      <section className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-5 space-y-3">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">
          データエクスポート
        </h2>
        <p className="text-xs text-[var(--text-muted)]">
          あなたのアカウントデータ（タスク・AI利用履歴・テンプレート）をJSON形式でダウンロードできます。
        </p>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="px-4 py-2 text-sm font-medium border border-[var(--border)] rounded-lg text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {exporting ? "準備中..." : "データをダウンロード"}
        </button>
      </section>

      {/* 2. Analytics opt-out (CCPA) */}
      <section className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-5 space-y-3">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">
          利用状況データの収集（CCPA）
        </h2>
        <p className="text-xs text-[var(--text-muted)]">
          サービス改善のための匿名利用状況データの収集をオプトアウトできます。
        </p>
        <div className="flex items-center gap-3">
          <button
            role="switch"
            aria-checked={optedOut}
            onClick={handleOptOut}
            disabled={optingOut || optedOut}
            className={`relative w-10 h-5 rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              optedOut ? "bg-[var(--accent)]" : "bg-[var(--bg-tertiary)]"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                optedOut ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
          <span className="text-sm text-[var(--text-primary)]">
            利用状況データの収集をオプトアウト
          </span>
          {optedOut && (
            <span className="text-xs text-[var(--text-muted)]">（設定済み）</span>
          )}
        </div>
      </section>

      {/* 3. Account deletion (GDPR right to erasure) */}
      <section className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-5 space-y-3">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">
          アカウントの削除
        </h2>
        <p className="text-xs text-[var(--text-muted)]">
          アカウントとすべての関連データを完全に削除します（GDPR 忘れられる権利）。この操作は取り消せません。
        </p>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="px-4 py-2 text-sm font-medium border border-[var(--border)] rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] transition-colors"
        >
          アカウントを削除
        </button>
      </section>

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-xl">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              アカウントを削除しますか？
            </h2>
            <p className="text-sm text-[var(--text-muted)]">
              この操作は取り消せません。確認のため、登録済みのメールアドレスを入力してください。
            </p>
            <input
              type="email"
              value={deleteEmail}
              onChange={(e) => setDeleteEmail(e.target.value)}
              placeholder={user?.email ?? "メールアドレス"}
              className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
            {deleteError && (
              <p className="text-xs text-red-500">{deleteError}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteEmail("");
                  setDeleteError("");
                }}
                className="flex-1 px-3 py-2 text-sm border border-[var(--border)] rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting || deleteEmail !== user?.email}
                className="flex-1 px-3 py-2 text-sm border border-[var(--border)] rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {deleting ? "削除中..." : "削除する"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
