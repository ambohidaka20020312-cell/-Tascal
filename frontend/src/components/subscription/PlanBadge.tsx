type Plan = "free" | "pro" | "team";

interface PlanBadgeProps {
  plan: Plan;
}

const planConfig: Record<Plan, { label: string; className: string }> = {
  free: {
    label: "Free",
    className: "bg-gray-100 text-gray-600 border border-gray-200",
  },
  pro: {
    label: "Pro",
    className: "bg-indigo-100 text-indigo-700 border border-indigo-200",
  },
  team: {
    label: "Team",
    className: "bg-yellow-100 text-yellow-700 border border-yellow-300",
  },
};

export default function PlanBadge({ plan }: PlanBadgeProps) {
  const { label, className } = planConfig[plan];
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
