import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useTrialBanner } from "../../hooks/useTrialBanner";

export default function TrialBanner() {
  const { t } = useTranslation();
  const { isTrialActive, trialDaysLeft } = useTrialBanner();

  if (isTrialActive) {
    return (
      <div
        className="sticky top-0 z-50 flex items-center justify-center gap-3 border-b border-[var(--border)] bg-[var(--bg-secondary)] px-4"
        style={{ height: 36 }}
      >
        <span className="text-xs text-[var(--text-primary)] font-medium">
          {t("subscription.trial_active", { days: trialDaysLeft })}
        </span>
        <Link
          to="/app/plans"
          className="text-xs text-[var(--accent)] font-semibold hover:opacity-70 transition-opacity"
        >
          {t("subscription.continue_pro")}
        </Link>
      </div>
    );
  }

  return (
    <div
      className="sticky top-0 z-50 flex items-center justify-center border-b border-[var(--border)] bg-[var(--bg-secondary)] px-4"
      style={{ height: 36 }}
    >
      <button
        disabled
        className="text-xs text-[var(--text-primary)] font-semibold opacity-50 cursor-not-allowed"
      >
        App Storeにて近日公開
      </button>
    </div>
  );
}
