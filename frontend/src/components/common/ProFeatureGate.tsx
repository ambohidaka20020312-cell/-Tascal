import React from "react";
import { usePlan } from "../../hooks/usePlan";
import Button from "./Button";

type RequiredPlan = "pro" | "team" | "personal_pro" | "business" | "enterprise";

interface ProFeatureGateProps {
  children: React.ReactNode;
  requiredPlan: RequiredPlan;
  fallback?: React.ReactNode;
}

const PLAN_LABEL: Record<RequiredPlan, string> = {
  pro: "Pro",
  team: "Team",
  personal_pro: "Personal Pro",
  business: "Business",
  enterprise: "Enterprise",
};

const PLAN_PRICE: Record<RequiredPlan, string> = {
  pro: "¥480/月",
  team: "¥2,980/月",
  personal_pro: "¥480/月",
  business: "¥4,980/月",
  enterprise: "¥19,800/月",
};

function hasSufficientPlan(
  currentPlan: string,
  required: RequiredPlan
): boolean {
  const rank: Record<string, number> = { free: 0, pro: 1, personal_pro: 1, team: 2, business: 2, enterprise: 3 };
  return (rank[currentPlan] ?? 0) >= (rank[required] ?? 99);
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
          window.location.href = "/app/plans";
        }}
      >
        プランをアップグレード
      </Button>
    </div>
  );
}
