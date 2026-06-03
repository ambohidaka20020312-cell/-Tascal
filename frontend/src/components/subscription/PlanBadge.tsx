type Plan = "free" | "pro" | "team" | "personal_pro" | "business" | "enterprise";

interface PlanBadgeProps {
  plan: Plan;
}

const planConfig: Record<Plan, { label: string; className: string }> = {
  free: {
    label: "Free",
    className: "bg-gray-100 text-gray-600 border border-gray-200",
  },
  // Legacy alias
  pro: {
    label: "Pro",
    className: "bg-indigo-100 text-indigo-700 border border-indigo-200",
  },
  // Legacy alias
  team: {
    label: "Team",
    className: "bg-yellow-100 text-yellow-700 border border-yellow-300",
  },
  personal_pro: {
    label: "Pro",
    className: "bg-indigo-100 text-indigo-700 border border-indigo-200",
  },
  business: {
    label: "Business",
    className: "bg-blue-100 text-blue-700 border border-blue-200",
  },
  enterprise: {
    label: "Enterprise",
    className: "bg-purple-100 text-purple-700 border border-purple-200",
  },
};

export default function PlanBadge({ plan }: PlanBadgeProps) {
  const { label, className } = planConfig[plan] ?? planConfig["free"];
  return (
    <span
      className={[
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold",
        className,
      ].join(" ")}
    >
      {label}
    </span>
  );
}
