import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { useSubscription, useCheckout, usePortal } from "../hooks/useBilling";
import { useIAP } from "../hooks/useIAP";
import { isWeb } from "../utils/platform";
import analytics from "../utils/analytics";

// ─── Feature rows ─────────────────────────────────────────────────────────────
interface FeatureRow {
  label: string;
  free: string | boolean;
  pro: string | boolean;
  team: string | boolean;
}

const FEATURES: FeatureRow[] = [
  { label: "タスク数",       free: "20件/月", pro: "無制限",  team: "無制限" },
  { label: "AI最適化",      free: "3回/日",  pro: "無制限",  team: "無制限" },
  { label: "週次インサイト", free: false,     pro: true,      team: true },
  { label: "広告",          free: "あり",    pro: "なし",    team: "なし" },
  { label: "チーム共有",    free: false,     pro: false,     team: "最大5名" },
  { label: "優先サポート",  free: false,     pro: false,     team: true },
];

// ─── Cell renderer ─────────────────────────────────────────────────────────────
function Cell({ value }: { value: string | boolean }) {
  if (value === true) {
    return <span className="text-[var(--text-primary)] font-medium select-none">✓</span>;
  }
  if (value === false) {
    return <span className="text-[var(--text-subtle)] select-none">✗</span>;
  }
  return <span className="text-[var(--text-primary)] text-sm">{value}</span>;
}

// ─── Plan types ────────────────────────────────────────────────────────────────
type PlanKey = "free" | "pro" | "team";
type AnyPlan = "free" | "pro" | "team" | "personal_pro" | "business" | "enterprise";

/** Normalise legacy / extended plan keys to the 3-column model */
function normalisePlan(plan: AnyPlan): PlanKey {
  if (plan === "personal_pro") return "pro";
  if (plan === "business" || plan === "enterprise") return "team";
  return plan as PlanKey;
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function SubscriptionPage() {
  const [searchParams] = useSearchParams();
  const [annual, setAnnual] = useState(false);
  const [iapError, setIapError] = useState("");

  const user = useAuthStore((s) => s.user);
  const { data: subscription, isLoading } = useSubscription();
  const checkout = useCheckout();
  const portal = usePortal();
  const iap = useIAP();

  const useNativeIAP = !isWeb() && iap.available;

  const rawPlan: AnyPlan = ((subscription?.plan ?? user?.plan ?? "free") as AnyPlan);
  const currentPlan: PlanKey = normalisePlan(rawPlan);
  const isPaid = currentPlan !== "free";

  // Feedback on Stripe redirect return (web only)
  useEffect(() => {
    if (!isWeb()) return;
    if (searchParams.get("success") === "true") {
      alert("プランのアップグレードが完了しました！");
    }
    if (searchParams.get("canceled") === "true") {
      alert("チェックアウトがキャンセルされました。");
    }
  }, [searchParams]);

  async function handleUpgrade(plan: "pro" | "team") {
    analytics.track("upgrade_clicked", { plan, is_native: useNativeIAP });
    if (useNativeIAP) {
      // Native: use RevenueCat / Apple IAP
      setIapError("");
      const pkgId = plan === "pro" ? "$rc_monthly" : "$rc_annual";
      const offering = iap.offerings[0];
      const pkg = offering?.packages.find(
        (p) => p.identifier === pkgId || p.packageType === (plan === "pro" ? "MONTHLY" : "ANNUAL")
      ) ?? offering?.packages[0];
      if (!pkg) {
        setIapError("購入プランが見つかりません。後でもう一度お試しください。");
        return;
      }
      try {
        await iap.purchase(pkg);
      } catch {
        // error is set inside hook
      }
    } else {
      // Web: Stripe checkout
      checkout.mutate(plan);
    }
  }

  function handlePortal() {
    if (useNativeIAP) {
      // Native: direct to OS subscription settings
      window.open("https://apps.apple.com/account/subscriptions", "_blank");
    } else {
      portal.mutate();
    }
  }

  async function handleRestore() {
    setIapError("");
    try {
      await iap.restore();
    } catch {
      setIapError("購入の復元に失敗しました。");
    }
  }

  // ─── Prices ───────────────────────────────────────────────────────────────
  const PRICES: Record<PlanKey, { monthly: string; annual: string; note: string; annualNote: string }> = {
    free: { monthly: "¥0",     annual: "¥0",      note: "ずっと無料", annualNote: "ずっと無料" },
    pro:  { monthly: "¥980",   annual: "¥9,800",  note: "/ 月",       annualNote: "/ 年" },
    team: { monthly: "¥2,980", annual: "¥29,800", note: "/ 月",       annualNote: "/ 年" },
  };

  function price(plan: PlanKey) {
    return annual ? PRICES[plan].annual : PRICES[plan].monthly;
  }
  function priceNote(plan: PlanKey) {
    return annual ? PRICES[plan].annualNote : PRICES[plan].note;
  }

  // ─── Column config ────────────────────────────────────────────────────────
  const COLUMNS: { key: PlanKey; label: string; highlighted: boolean; badge?: string }[] = [
    { key: "free", label: "Free", highlighted: false },
    { key: "pro",  label: "Pro",  highlighted: true, badge: "おすすめ" },
    { key: "team", label: "Team", highlighted: false },
  ];

  const upgradeOrder: PlanKey[] = ["free", "pro", "team"];

  // ─── CTA button per column ────────────────────────────────────────────────
  function renderCTA(plan: PlanKey) {
    if (plan === currentPlan) {
      return (
        <button
          disabled
          className="w-full h-10 border border-[var(--border)] text-[var(--text-subtle)] text-xs tracking-[0.15em] uppercase rounded-lg opacity-60 cursor-not-allowed"
        >
          現在のプラン
        </button>
      );
    }

    const isUpgrade =
      upgradeOrder.indexOf(plan) > upgradeOrder.indexOf(currentPlan);

    if (isUpgrade) {
      return (
        <button
          disabled={checkout.isPending}
          onClick={() => handleUpgrade(plan as "pro" | "team")}
          className="w-full h-10 bg-[var(--text-primary)] text-[var(--bg-primary)] text-xs font-semibold tracking-[0.15em] uppercase rounded-lg hover:opacity-80 transition-opacity disabled:opacity-40"
        >
          {checkout.isPending ? "処理中..." : "アップグレード"}
        </button>
      );
    }

    // Downgrade → Stripe customer portal
    return (
      <button
        disabled={portal.isPending}
        onClick={handlePortal}
        className="w-full h-10 text-[var(--text-subtle)] text-xs tracking-[0.1em] underline underline-offset-2 hover:text-[var(--text-primary)] transition-colors disabled:opacity-40"
      >
        {portal.isPending ? "処理中..." : "ダウングレード"}
      </button>
    );
  }

  const PLAN_LABELS: Record<PlanKey, string> = { free: "Free", pro: "Pro", team: "Team" };

  return (
    <div className="bg-[var(--bg-primary)] py-8 sm:py-12 px-4 mb-16 md:mb-0">
      <div className="mx-auto max-w-3xl">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="mb-8 text-center">
          <p className="text-[10px] tracking-[0.25em] uppercase text-[var(--text-subtle)] mb-2">PRICING</p>
          <h1 className="text-2xl sm:text-3xl font-light tracking-wide text-[var(--text-primary)]">料金プラン</h1>
          <p className="mt-2 text-[var(--text-muted)] text-sm">
            あなたのワークフローに合ったプランを選びましょう
          </p>
        </div>

        {/* ── Current plan badge ──────────────────────────────────────────── */}
        <div className="mb-6 flex justify-center">
          {isLoading ? (
            <div className="h-8 w-48 animate-pulse bg-[var(--bg-secondary)] rounded-full" />
          ) : (
            <div className="inline-flex items-center gap-2 border border-[var(--border)] rounded-full px-4 py-1.5">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{
                  backgroundColor:
                    currentPlan === "free"
                      ? "var(--text-subtle)"
                      : "var(--text-primary)",
                }}
              />
              <span className="text-xs text-[var(--text-muted)]">現在のプラン:</span>
              <span className="text-xs font-semibold text-[var(--text-primary)] tracking-wide">
                {PLAN_LABELS[currentPlan]}
              </span>
              {subscription?.cancel_at_period_end && (
                <span className="text-[10px] text-[var(--text-subtle)]">（キャンセル予定）</span>
              )}
            </div>
          )}
        </div>

        {/* ── Annual / Monthly toggle ─────────────────────────────────────── */}
        <div className="mb-8 flex justify-center">
          <div className="inline-flex items-center gap-3">
            <span
              className={`text-sm transition-colors ${
                !annual ? "text-[var(--text-primary)] font-medium" : "text-[var(--text-muted)]"
              }`}
            >
              月払い
            </span>

            <button
              onClick={() => setAnnual((v) => !v)}
              aria-pressed={annual}
              className={[
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                annual
                  ? "bg-[var(--text-primary)]"
                  : "bg-[var(--bg-secondary)] border border-[var(--border)]",
              ].join(" ")}
            >
              <span
                className={[
                  "inline-block h-4 w-4 transform rounded-full shadow transition-transform",
                  annual
                    ? "translate-x-6 bg-[var(--bg-primary)]"
                    : "translate-x-1 bg-[var(--bg-primary)] border border-[var(--border)]",
                ].join(" ")}
              />
            </button>

            <span
              className={`text-sm transition-colors ${
                annual ? "text-[var(--text-primary)] font-medium" : "text-[var(--text-muted)]"
              }`}
            >
              年払い
              <span className="ml-1.5 text-[10px] tracking-[0.1em] text-[var(--text-subtle)]">
                2ヶ月分お得
              </span>
            </span>
          </div>
        </div>

        {/* ── Comparison table ────────────────────────────────────────────── */}
        <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
          <table className="w-full border-collapse min-w-[480px]">
            <thead>
              <tr>
                {/* Feature label column header */}
                <th className="w-[36%] bg-[var(--bg-secondary)] border-b border-[var(--border)] px-4 py-4 text-left">
                  <span className="sr-only">機能</span>
                </th>

                {COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    className={[
                      "w-[21%] px-3 py-4 text-center align-top",
                      col.highlighted
                        ? "border-x border-b border-[var(--text-primary)] bg-[var(--bg-primary)]"
                        : "border-b border-[var(--border)] bg-[var(--bg-secondary)]",
                    ].join(" ")}
                  >
                    {/* "おすすめ" badge row — always present for height alignment */}
                    <div className="mb-1.5 h-[20px] flex items-center justify-center">
                      {col.badge && (
                        <span className="text-[9px] tracking-[0.15em] uppercase text-[var(--text-subtle)] border border-[var(--border)] rounded-full px-2 py-0.5">
                          {col.badge}
                        </span>
                      )}
                    </div>

                    <p className="text-sm font-semibold text-[var(--text-primary)] tracking-wide">
                      {col.label}
                    </p>

                    <div className="mt-2 flex items-end justify-center gap-0.5">
                      <span className="text-xl font-light text-[var(--text-primary)] leading-none">
                        {price(col.key)}
                      </span>
                    </div>

                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                      {priceNote(col.key)}
                    </p>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {FEATURES.map((row, i) => (
                <tr
                  key={row.label}
                  className={i % 2 === 0 ? "bg-[var(--bg-primary)]" : "bg-[var(--bg-secondary)]"}
                >
                  <td className="border-b border-[var(--border)] px-4 py-3 text-sm text-[var(--text-muted)]">
                    {row.label}
                  </td>
                  {COLUMNS.map((col) => (
                    <td
                      key={col.key}
                      className={[
                        "border-b border-[var(--border)] px-3 py-3 text-center text-sm",
                        col.highlighted ? "border-x border-[var(--text-primary)]" : "",
                      ].join(" ")}
                    >
                      <Cell value={row[col.key]} />
                    </td>
                  ))}
                </tr>
              ))}

              {/* CTA row */}
              <tr className="bg-[var(--bg-primary)]">
                <td className="px-4 py-4" />
                {COLUMNS.map((col) => (
                  <td
                    key={col.key}
                    className={[
                      "px-3 py-4 text-center",
                      col.highlighted
                        ? "border-x border-b border-[var(--text-primary)] rounded-b"
                        : "",
                    ].join(" ")}
                  >
                    {renderCTA(col.key)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {/* ── IAP error ───────────────────────────────────────────────────── */}
        {(iapError || iap.error) && (
          <p className="mt-4 text-center text-xs text-red-500">
            {iapError || iap.error}
          </p>
        )}

        {/* ── Subscription management ─────────────────────────────────────── */}
        {isPaid && (
          <div className="mt-8 flex flex-col items-center gap-3">
            <p className="text-xs text-[var(--text-subtle)] tracking-wide">
              {useNativeIAP
                ? "サブスクリプションはiOS設定から管理できます。"
                : "支払い方法・キャンセルはStripeポータルから管理できます。"}
            </p>
            <button
              disabled={portal.isPending}
              onClick={handlePortal}
              className="px-5 h-9 border border-[var(--border)] text-[var(--text-primary)] text-xs tracking-[0.15em] uppercase rounded-lg hover:bg-[var(--bg-secondary)] transition-colors disabled:opacity-40"
            >
              {portal.isPending ? "処理中..." : "プランを管理する"}
            </button>
          </div>
        )}

        {/* ── Restore purchases (native IAP required by Apple guidelines) ─── */}
        {useNativeIAP && (
          <div className="mt-6 flex justify-center">
            <button
              onClick={handleRestore}
              disabled={iap.loading}
              className="text-xs text-[var(--text-subtle)] underline underline-offset-2 hover:text-[var(--text-muted)] transition-colors disabled:opacity-40"
            >
              {iap.loading ? "確認中..." : "購入を復元する"}
            </button>
          </div>
        )}

        {/* ── Renewal date (web / Stripe) ─────────────────────────────────── */}
        {!useNativeIAP && subscription?.current_period_end && (
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
