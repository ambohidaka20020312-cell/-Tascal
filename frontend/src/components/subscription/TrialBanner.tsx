import { useRevenueCat } from "../../hooks/useRevenueCat";

export default function TrialBanner() {
  const { purchasePro, isLoading } = useRevenueCat();

  return (
    <div
      className="sticky top-0 z-50 flex items-center justify-center border-b border-[var(--border)] bg-[var(--bg-secondary)] px-4"
      style={{ height: 36 }}
    >
      <button
        onClick={() => purchasePro()}
        disabled={isLoading}
        className="text-xs text-[var(--text-primary)] font-semibold hover:opacity-70 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {isLoading ? "処理中..." : "Proにアップグレード — ¥480/月"}
      </button>
    </div>
  );
}
