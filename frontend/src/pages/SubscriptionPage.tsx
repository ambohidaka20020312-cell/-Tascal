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

  return (
    <div className="bg-[var(--bg-primary)] py-8 sm:py-12 px-4 mb-16 md:mb-0">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8 sm:mb-10 text-center">
          <p className="text-[10px] tracking-[0.25em] uppercase text-[var(--text-subtle)] mb-2">PRICING</p>
          <h1 className="text-2xl sm:text-3xl font-light tracking-wide text-[var(--text-primary)]">料金プラン</h1>
          <p className="mt-2 text-[var(--text-muted)] text-sm">
            あなたのワークフローに合ったプランを選びましょう
          </p>
          {isLoading && (
            <div className="mt-3 h-4 w-32 mx-auto animate-pulse bg-[var(--bg-secondary)] rounded" />
          )}
          {!isLoading && (
            <div className="mt-3 inline-flex items-center gap-2 border border-[var(--border)] rounded-full px-4 py-2 text-sm text-[var(--text-muted)]">
              現在のプラン:
              <PlanBadge plan={currentPlan as "free" | "personal_pro" | "business" | "enterprise"} />
            </div>
          )}
        </div>

        {/* Tab switcher — underline style */}
        <div className="mb-8 flex justify-center">
          <div className="inline-flex border-b border-[var(--border)]">
            <button
              onClick={() => setActiveTab("personal")}
              className={[
                "px-6 py-2 text-sm tracking-wide transition-colors -mb-px",
                activeTab === "personal"
                  ? "border-b-2 border-[var(--text-primary)] text-[var(--text-primary)] font-medium"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]",
              ].join(" ")}
            >
              個人向け
            </button>
            <button
              onClick={() => setActiveTab("business")}
              className={[
                "px-6 py-2 text-sm tracking-wide transition-colors -mb-px",
                activeTab === "business"
                  ? "border-b-2 border-[var(--text-primary)] text-[var(--text-primary)] font-medium"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]",
              ].join(" ")}
            >
              法人向け
            </button>
          </div>
        </div>

        {/* Plan cards — 1 column mobile, 2 columns md+ */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
          {plans
            .filter((plan) => plan.id !== "enterprise")
            .map((plan) => {
              const isCurrent = plan.id === currentPlan;

              return (
                <div
                  key={plan.id}
                  className={[
                    "relative flex flex-col rounded-xl border border-[var(--border)] p-6 bg-[var(--bg-primary)]",
                    isCurrent ? "ring-1 ring-[var(--text-primary)]" : "",
                  ].join(" ")}
                >
                  {/* Badge */}
                  {plan.badgeText && (
                    <span className="absolute -top-3 left-6 text-[10px] tracking-[0.15em] uppercase text-[var(--text-subtle)] border border-[var(--border)] bg-[var(--bg-primary)] px-2 py-0.5 rounded-full">
                      {plan.badgeText}
                    </span>
                  )}

                  {/* Plan name & price */}
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <h2 className="text-base font-medium text-[var(--text-primary)]">
                        {plan.name}
                      </h2>
                      {isCurrent && (
                        <PlanBadge plan={plan.id as "free" | "personal_pro" | "business" | "enterprise"} />
                      )}
                    </div>
                    <div className="flex items-end gap-1">
                      <span className="text-3xl font-light text-[var(--text-primary)]">
                        {plan.price}
                      </span>
                      <span className="mb-1 text-sm text-[var(--text-muted)]">
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
                          <CheckIcon className="h-4 w-4 flex-shrink-0 text-[var(--text-primary)]" />
                        ) : (
                          <XIcon className="h-4 w-4 flex-shrink-0 text-[var(--text-subtle)]" />
                        )}
                        <span className={feature.included ? "text-[var(--text-primary)]" : "text-[var(--text-subtle)]"}>
                          {feature.text}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  {isCurrent ? (
                    <button disabled className="w-full h-11 border border-[var(--border)] text-[var(--text-subtle)] text-xs tracking-[0.15em] uppercase rounded-lg opacity-60 cursor-not-allowed">
                      現在のプラン
                    </button>
                  ) : plan.id === "free" ? (
                    <button disabled className="w-full h-11 border border-[var(--border)] text-[var(--text-subtle)] text-xs tracking-[0.15em] uppercase rounded-lg opacity-60 cursor-not-allowed">
                      選択中
                    </button>
                  ) : (
                    <button
                      disabled={checkout.isPending}
                      className="w-full h-11 bg-[var(--text-primary)] text-[var(--bg-primary)] text-xs font-semibold tracking-[0.15em] uppercase rounded-lg hover:opacity-80 transition-opacity disabled:opacity-40"
                      onClick={() =>
                        handleUpgrade(plan.id as "personal_pro" | "business" | "enterprise")
                      }
                    >
                      {checkout.isPending ? "..." : "今すぐ始める"}
                    </button>
                  )}
                </div>
              );
            })}
        </div>

        {/* Enterprise banner */}
        {plans.some((p) => p.id === "enterprise") && (
          <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl px-6 py-5">
            <div>
              <p className="text-[10px] tracking-[0.2em] uppercase text-[var(--text-subtle)] mb-1">ENTERPRISE</p>
              <p className="text-sm font-medium text-[var(--text-primary)]">大規模チーム向けカスタムプラン</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">SSO・専用サポート・カスタムAIモデル対応。¥19,800〜/月</p>
            </div>
            <a
              href="mailto:enterprise@tascal.app"
              className="shrink-0 px-5 h-9 inline-flex items-center bg-[var(--text-primary)] text-[var(--bg-primary)] text-xs font-semibold tracking-[0.15em] uppercase rounded-lg hover:opacity-80 transition-opacity"
            >
              お問い合わせ
            </a>
          </div>
        )}

        {/* Manage subscription (paid users only) */}
        {isPaid && (
          <div className="mt-8 flex flex-col items-center gap-3">
            <p className="text-xs text-[var(--text-subtle)] tracking-wide">
              支払い方法・キャンセルはStripeポータルから管理できます。
            </p>
            <button
              disabled={portal.isPending}
              onClick={handlePortal}
              className="px-5 h-9 border border-[var(--border)] text-[var(--text-primary)] text-xs tracking-[0.15em] uppercase rounded-lg hover:bg-[var(--bg-secondary)] transition-colors disabled:opacity-40"
            >
              {portal.isPending ? "..." : "プランを管理する"}
            </button>
          </div>
        )}

        {/* Subscription status detail */}
        {subscription && subscription.current_period_end && (
          <p className="mt-4 text-center text-xs text-[var(--text-subtle)]">
            次回更新日:{" "}
            {new Date(subscription.current_period_end).toLocaleDateString("ja-JP")}
            {subscription.cancel_at_period_end && " （期間終了後にキャンセル予定）"}
          </p>
        )}
      </div>
    </div>
  );
}
