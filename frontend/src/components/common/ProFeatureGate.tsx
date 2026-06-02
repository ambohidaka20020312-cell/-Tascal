import React from "react";
import { usePlan } from "../../hooks/usePlan";
import Button from "./Button";

type RequiredPlan = "pro" | "team";

interface ProFeatureGateProps {
  children: React.ReactNode;
  /** Minimum plan required to access the wrapped feature */
  requiredPlan: RequiredPlan;
  /** Optional custom fallback UI. Defaults to an upgrade-prompt card. */
  fallback?: React.ReactNode;
}

const PLAN_LABEL: Record<RequiredPlan, string> = {
  pro: "Pro",
  team: "Team",
};

const PLAN_PRICE: Record<RequiredPlan, string> = {
  pro: "¥980/月",
  team: "¥2,980/月",
};

/**
 * Checks whether the user's current plan satisfies the requirement.
 * team > pro > free
 */
function hasSufficientPlan(
  currentPlan: "free" | "pro" | "team",
  required: RequiredPlan
): boolean {
  const rank: Record<string, number> = { free: 0, pro: 1, team: 2 };
  return rank[currentPlan] >= rank[required];
}

/**
 * ProFeatureGate — wraps a feature that requires a Pro or Team subscription.
 *
 * Usage:
 *   <ProFeatureGate requiredPlan="pro">
 *     <AIAdvancedFeature />
 *   </ProFeatureGate>
 */
export default function ProFeatureGate({
  children,
  requiredPlan,
  fallback,
}: ProFeatureGateProps) {
  const { plan } = usePlan();

  if (hasSufficientPlan(plan, requiredPlan)) {
    return <>{children}</>;
  }

  if (fallback !== undefined) {
    return <>{fallback}</>;
  }

  // Default upgrade-prompt UI
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-primary-300 bg-primary-50 p-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100">
        <svg
          className="h-6 w-6 text-primary-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
      </div>

      <div>
        <p className="text-sm font-semibold text-gray-800">
          {PLAN_LABEL[requiredPlan]}プランが必要です
        </p>
        <p className="mt-1 text-xs text-gray-500">
          この機能は {PLAN_LABEL[requiredPlan]} ({PLAN_PRICE[requiredPlan]})
          以上のプランでご利用いただけます。
        </p>
      </div>

      <Button
        size="sm"
        onClick={() => {
          window.location.href = "/plans";
        }}
      >
        プランをアップグレード
      </Button>
    </div>
  );
}
