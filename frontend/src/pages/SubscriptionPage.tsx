import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { useSubscription, useCheckout, usePortal } from "../hooks/useBilling";
import Button from "../components/common/Button";
import PlanBadge from "../components/subscription/PlanBadge";

interface PlanFeature {
  text: string;
  included: boolean;
}

interface PlanConfig {
  id: "free" | "pro" | "team";
  name: string;
  price: string;
  priceNote: string;
  features: PlanFeature[];
  highlighted: boolean;
  badgeText?: string;
}

const plans: PlanConfig[] = [
  {
    id: "free",
    name: "Free",
    price: "¥0",
    priceNote: "ずっと無料",
    highlighted: false,
    features: [
      { text: "タスク 20件/月", included: true },
      { text: "AI最適化 3回/日", included: true },
      { text: "カレンダービュー", included: true },
      { text: "広告表示あり", included: true },
      { text: "無制限タスク", included: false },
      { text: "AI最適化 無制限", included: false },
      { text: "高度な分析", included: false },
      { text: "チーム共有", included: false },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "¥980",
    priceNote: "/ 月",
    highlighted: true,
    badgeText: "人気No.1",
    features: [
      { text: "タスク 無制限", included: true },
      { text: "AI最適化 無制限", included: true },
      { text: "カレンダービュー", included: true },
      { text: "広告非表示", included: true },
      { text: "高度な分析", included: true },
      { text: "優先サポート", included: true },
      { text: "チーム共有", included: false },
      { text: "メンバー管理", included: false },
    ],
  },
  {
    id: "team",
    name: "Team",
    price: "¥2,980",
    priceNote: "/ 月",
    highlighted: false,
    badgeText: "チーム向け",
    features: [
      { text: "タスク 無制限", included: true },
      { text: "AI最適化 無制限", included: true },
      { text: "カレンダービュー", included: true },
      { text: "広告非表示", included: true },
      { text: "高度な分析", included: true },
      { text: "優先サポート", included: true },
      { text: "チーム共有（最大5名）", included: true },
      { text: "メンバー管理", included: true },
    ],
  },
];

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
    </svg>
  );
}

export default function SubscriptionPage() {
  const [searchParams] = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const { data: subscription, isLoading } = useSubscription();
  const checkout = useCheckout();
  const portal = usePortal();

  const currentPlan = subscription?.plan ?? user?.plan ?? "free";
  const isPaid = currentPlan !== "free";

  const successParam = searchParams.get("success");
  const canceledParam = searchParams.get("canceled");

  useEffect(() => {
    if (successParam === "true") {
      // Optionally show a success toast — for now a simple alert
      alert("プランのアップグレードが完了しました！");
    }
    if (canceledParam === "true") {
      alert("チェックアウトがキャンセルされました。");
    }
  }, [successParam, canceledParam]);

  function handleUpgrade(planId: "pro" | "team") {
    checkout.mutate(planId);
  }

  function handlePortal() {
    portal.mutate();
  }

  const cardBorderClass = (plan: PlanConfig) => {
    if (plan.id === currentPlan)
      return "border-2 border-indigo-500 ring-2 ring-indigo-200";
    if (plan.highlighted) return "border-2 border-indigo-300";
    return "border border-gray-200";
  };

  return (
    <div className="bg-gray-50 py-8 sm:py-12 px-4 mb-16 md:mb-0">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-8 sm:mb-10 text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">料金プラン</h1>
          <p className="mt-2 text-gray-500 text-sm sm:text-base">
            あなたのワークフローに合ったプランを選びましょう
          </p>
          {isLoading && (
            <p className="mt-1 text-sm text-gray-400">サブスク情報を取得中…</p>
          )}
          {!isLoading && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 shadow-sm border border-gray-200 text-sm text-gray-600">
              現在のプラン:
              <PlanBadge plan={currentPlan} />
              {currentPlan !== "free" && (
                <span className="ml-1 text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                  ご利用中
                </span>
              )}
            </div>
          )}
        </div>

        {/* Plan cards — 1 column mobile, 3 columns md+ */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
          {plans.map((plan) => {
            const isCurrent = plan.id === currentPlan;
            const isDowngrade =
              (currentPlan === "team" && plan.id !== "team") ||
              (currentPlan === "pro" && plan.id === "free");

            return (
              <div
                key={plan.id}
                className={[
                  "relative flex flex-col rounded-2xl bg-white shadow-sm p-6 sm:p-8 transition-transform hover:shadow-md",
                  isCurrent ? "scale-[1.02]" : "hover:-translate-y-1",
                  cardBorderClass(plan),
                ].join(" ")}
              >
                {/* Badge */}
                {plan.badgeText && (
                  <span
                    className={[
                      "absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-0.5 text-xs font-semibold shadow",
                      plan.highlighted
                        ? "bg-indigo-600 text-white"
                        : "bg-yellow-400 text-yellow-900",
                    ].join(" ")}
                  >
                    {plan.badgeText}
                  </span>
                )}

                {/* Plan name & price */}
                <div className="mb-6">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-gray-900">
                      {plan.name}
                    </h2>
                    {isCurrent && <PlanBadge plan={plan.id} />}
                  </div>
                  <div className="mt-3 flex items-end gap-1">
                    <span className="text-4xl font-extrabold text-gray-900">
                      {plan.price}
                    </span>
                    <span className="mb-1 text-sm text-gray-500">
                      {plan.priceNote}
                    </span>
                  </div>
                </div>

                {/* Features */}
                <ul className="mb-8 flex-1 space-y-3">
                  {plan.features.map((feature) => (
                    <li
                      key={feature.text}
                      className="flex items-center gap-2 text-sm"
                    >
                      {feature.included ? (
                        <CheckIcon className="h-4 w-4 flex-shrink-0 text-indigo-500" />
                      ) : (
                        <XIcon className="h-4 w-4 flex-shrink-0 text-gray-300" />
                      )}
                      <span
                        className={
                          feature.included ? "text-gray-700" : "text-gray-400"
                        }
                      >
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                {isCurrent ? (
                  <Button variant="secondary" size="lg" disabled className="w-full">
                    現在のプラン
                  </Button>
                ) : plan.id === "free" ? (
                  <Button
                    variant="secondary"
                    size="lg"
                    disabled={isDowngrade}
                    className="w-full"
                  >
                    {isDowngrade ? "ダウングレード不可" : "選択中"}
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="lg"
                    loading={checkout.isPending}
                    disabled={isDowngrade || checkout.isPending}
                    className={[
                      "w-full",
                      plan.highlighted
                        ? "bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500"
                        : "bg-yellow-500 hover:bg-yellow-600 focus:ring-yellow-500",
                    ].join(" ")}
                    onClick={() => handleUpgrade(plan.id as "pro" | "team")}
                  >
                    {isDowngrade ? "ダウングレード不可" : "アップグレード"}
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        {/* Manage subscription (paid users only) */}
        {isPaid && (
          <div className="mt-10 flex flex-col items-center gap-3">
            <p className="text-sm text-gray-500">
              支払い方法・キャンセルはStripeポータルから管理できます。
            </p>
            <Button
              variant="secondary"
              size="md"
              loading={portal.isPending}
              onClick={handlePortal}
            >
              プランを管理する
            </Button>
          </div>
        )}

        {/* Subscription status detail */}
        {subscription && subscription.current_period_end && (
          <p className="mt-4 text-center text-xs text-gray-400">
            次回更新日:{" "}
            {new Date(subscription.current_period_end).toLocaleDateString(
              "ja-JP"
            )}
            {subscription.cancel_at_period_end &&
              " （期間終了後にキャンセル予定）"}
          </p>
        )}
      </div>
    </div>
  );
}
