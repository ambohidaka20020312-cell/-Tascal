import { useEffect, useState } from "react";
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
  id: "free" | "personal_pro" | "business" | "enterprise";
  name: string;
  price: string;
  priceNote: string;
  features: PlanFeature[];
  highlighted: boolean;
  badgeText?: string;
  enterpriseContact?: boolean;
}

const personalPlans: PlanConfig[] = [
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
      { text: "タスク 無制限", included: false },
      { text: "AI最適化 無制限", included: false },
      { text: "週次インサイト", included: false },
    ],
  },
  {
    id: "personal_pro",
    name: "Personal Pro",
    price: "¥980",
    priceNote: "/ 月",
    highlighted: true,
    badgeText: "人気No.1",
    features: [
      { text: "タスク 無制限", included: true },
      { text: "AI最適化 無制限", included: true },
      { text: "カレンダービュー", included: true },
      { text: "広告非表示", included: true },
      { text: "週次インサイト", included: true },
      { text: "優先サポート", included: true },
    ],
  },
];

const businessPlans: PlanConfig[] = [
  {
    id: "business",
    name: "Business",
    price: "¥4,980",
    priceNote: "/ 月",
    highlighted: true,
    badgeText: "法人向け",
    features: [
      { text: "最大10名まで利用可能", included: true },
      { text: "部署管理", included: true },
      { text: "AIタスク振り分け", included: true },
      { text: "ローカルLLM対応", included: true },
      { text: "タスク 無制限", included: true },
      { text: "AI最適化 無制限", included: true },
      { text: "広告非表示", included: true },
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "¥19,800〜",
    priceNote: "/ 月",
    highlighted: false,
    badgeText: "大規模向け",
    enterpriseContact: true,
    features: [
      { text: "メンバー数 無制限", included: true },
      { text: "SSO対応", included: true },
      { text: "専用サポート", included: true },
      { text: "カスタムAIモデル", included: true },
      { text: "部署管理", included: true },
      { text: "AIタスク振り分け", included: true },
      { text: "ローカルLLM対応", included: true },
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

type TabKey = "personal" | "business";

export default function SubscriptionPage() {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabKey>("personal");
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
      alert("プランのアップグレードが完了しました！");
    }
    if (canceledParam === "true") {
      alert("チェックアウトがキャンセルされました。");
    }
  }, [successParam, canceledParam]);

  // Auto-select tab based on current plan
  useEffect(() => {
    if (currentPlan === "business" || currentPlan === "enterprise") {
      setActiveTab("business");
    }
  }, [currentPlan]);

  function handleUpgrade(planId: "personal_pro" | "business" | "enterprise") {
    checkout.mutate(planId);
  }

  function handlePortal() {
    portal.mutate();
  }

  const plans = activeTab === "personal" ? personalPlans : businessPlans;

  const cardBorderClass = (plan: PlanConfig) => {
    if (plan.id === currentPlan)
      return "border-2 border-indigo-500 ring-2 ring-indigo-200";
    if (plan.highlighted) return "border-2 border-indigo-300";
    return "border border-gray-200";
  };

  return (
    <div className="bg-gray-50 py-8 sm:py-12 px-4 mb-16 md:mb-0">
      <div className="mx-auto max-w-4xl">
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
              <PlanBadge plan={currentPlan as "free" | "personal_pro" | "business" | "enterprise"} />
              {currentPlan !== "free" && (
                <span className="ml-1 text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                  ご利用中
                </span>
              )}
            </div>
          )}
        </div>

        {/* Tab switcher */}
        <div className="mb-8 flex justify-center">
          <div className="inline-flex rounded-xl bg-white border border-gray-200 shadow-sm p-1 gap-1">
            <button
              onClick={() => setActiveTab("personal")}
              className={[
                "px-5 py-2 rounded-lg text-sm font-semibold transition-colors",
                activeTab === "personal"
                  ? "bg-indigo-600 text-white shadow"
                  : "text-gray-600 hover:text-gray-900",
              ].join(" ")}
            >
              個人向け
            </button>
            <button
              onClick={() => setActiveTab("business")}
              className={[
                "px-5 py-2 rounded-lg text-sm font-semibold transition-colors",
                activeTab === "business"
                  ? "bg-indigo-600 text-white shadow"
                  : "text-gray-600 hover:text-gray-900",
              ].join(" ")}
            >
              法人向け
            </button>
          </div>
        </div>

        {/* Plan cards — 1 column mobile, 2 columns md+ */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
          {plans.map((plan) => {
            const isCurrent = plan.id === currentPlan;

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
                    {isCurrent && (
                      <PlanBadge plan={plan.id as "free" | "personal_pro" | "business" | "enterprise"} />
                    )}
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
                  <Button variant="secondary" size="lg" disabled className="w-full">
                    選択中
                  </Button>
                ) : plan.enterpriseContact ? (
                  <a
                    href="mailto:enterprise@tascal.app"
                    className="block w-full text-center rounded-lg px-4 py-3 text-sm font-semibold bg-purple-600 hover:bg-purple-700 text-white transition-colors"
                  >
                    お問い合わせ
                  </a>
                ) : (
                  <Button
                    variant="primary"
                    size="lg"
                    loading={checkout.isPending}
                    disabled={checkout.isPending}
                    className={[
                      "w-full",
                      plan.highlighted
                        ? "bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500"
                        : "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500",
                    ].join(" ")}
                    onClick={() =>
                      handleUpgrade(
                        plan.id as "personal_pro" | "business" | "enterprise"
                      )
                    }
                  >
                    今すぐ始める
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
