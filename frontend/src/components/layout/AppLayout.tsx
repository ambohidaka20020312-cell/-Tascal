import React, { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { App as CapApp } from "@capacitor/app";
import { useAuthStore } from "../../store/authStore";
import { usePlan } from "../../hooks/usePlan";
import { isNative, platform } from "../../hooks/useCapacitor";
import { isMobile } from "../../utils/platform";
import AdBanner from "../ads/AdBanner";
import AdScript from "../ads/AdScript";

interface AppLayoutProps {
  children: React.ReactNode;
}

const PLAN_BADGE_CLASSES: Record<string, string> = {
  free: "bg-gray-100 text-gray-600",
  pro: "bg-primary-100 text-primary-700",
  team: "bg-purple-100 text-purple-700",
};

const PLAN_LABEL: Record<string, string> = {
  free: "Free",
  pro: "Pro",
  team: "Team",
};

function PlanBadge({ plan }: { plan: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${PLAN_BADGE_CLASSES[plan] ?? PLAN_BADGE_CLASSES.free}`}
    >
      {PLAN_LABEL[plan] ?? "Free"}
    </span>
  );
}

const NAV_ITEMS = [
  { label: "ダッシュボード", to: "/" },
  { label: "カレンダー", to: "/calendar" },
  { label: "プラン", to: "/plans" },
];

// Bottom tab bar items for native mobile
const TAB_ITEMS = [
  {
    label: "ダッシュボード",
    to: "/",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    label: "カレンダー",
    to: "/calendar",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    ),
  },
  {
    label: "+ タスク追加",
    to: "/tasks/new",
    icon: (
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
        <circle cx="12" cy="12" r="9" />
        <path strokeLinecap="round" d="M12 8v8M8 12h8" />
      </svg>
    ),
    primary: true,
  },
  {
    label: "プラン",
    to: "/plans",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
      </svg>
    ),
  },
];

export default function AppLayout({ children }: AppLayoutProps) {
  const { user, logout } = useAuthStore();
  const { plan, isFree } = usePlan();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const showMobileBottomNav = isNative || isMobile();

  // Handle Android hardware back button via Capacitor
  useEffect(() => {
    if (!isNative) return;

    const listenerPromise = CapApp.addListener("backButton", ({ canGoBack }) => {
      if (canGoBack) {
        navigate(-1);
      } else {
        // Minimise the app instead of exiting on the root screen
        CapApp.minimizeApp();
      }
    });

    return () => {
      listenerPromise.then((l) => l.remove());
    };
  }, [navigate]);

  return (
    <>
      {/* Inject AdSense script for free users only */}
      <AdScript />

      {/*
        pt-safe-top / pb-safe-bottom are resolved via CSS env() variables
        defined in capacitor.css (safe-area-inset-*).
        They are effectively 0 on web where the variables are not set.
      */}
      <div
        className={[
          "flex min-h-screen flex-col bg-gray-50",
          platform === "ios" ? "pt-safe-top" : "",
          showMobileBottomNav ? "pb-safe-bottom" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {/* ── Header ── */}
        <header className="sticky top-0 z-30 border-b border-gray-200 bg-white shadow-sm">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
            {/* Logo */}
            <Link
              to="/"
              className="flex items-center gap-2 text-xl font-bold text-primary-600 hover:text-primary-700"
            >
              <svg
                className="h-7 w-7"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </svg>
              Tascal
            </Link>

            {/* Desktop navigation — hidden when native bottom tab bar is shown */}
            {!showMobileBottomNav && (
              <nav className="hidden items-center gap-1 sm:flex">
                {NAV_ITEMS.map((item) => {
                  const isActive =
                    item.to === "/"
                      ? pathname === "/"
                      : pathname.startsWith(item.to);
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={[
                        "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-primary-50 text-primary-700"
                          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
                      ].join(" ")}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            )}

            {/* User info + logout */}
            {user && (
              <div className="flex items-center gap-3">
                <div className="hidden flex-col items-end sm:flex">
                  <span className="text-sm font-medium text-gray-800">
                    {user.name}
                  </span>
                  <PlanBadge plan={plan} />
                </div>
                <button
                  onClick={logout}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100"
                >
                  ログアウト
                </button>
              </div>
            )}
          </div>

          {/* Browser small-screen navigation (only on web) */}
          {!showMobileBottomNav && (
            <nav className="flex border-t border-gray-100 sm:hidden">
              {NAV_ITEMS.map((item) => {
                const isActive =
                  item.to === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={[
                      "flex-1 py-2 text-center text-xs font-medium transition-colors",
                      isActive
                        ? "border-b-2 border-primary-600 text-primary-700"
                        : "text-gray-500 hover:text-gray-800",
                    ].join(" ")}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          )}
        </header>

        {/* ── Main content ── */}
        <main
          className={[
            "mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8",
            // Extra bottom padding so content is not obscured by the tab bar
            showMobileBottomNav ? "pb-24" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {children}
        </main>

        {/* ── Footer (web only) ── */}
        {!showMobileBottomNav && (
          <footer className="border-t border-gray-200 bg-white">
            {/* Ad banner — only shown for Free plan users */}
            {isFree && (
              <div className="flex justify-center px-4 pt-4">
                <AdBanner
                  slot={import.meta.env.VITE_ADSENSE_FOOTER_SLOT ?? "0000000000"}
                  format="leaderboard"
                  className="w-full max-w-[728px]"
                />
              </div>
            )}

            <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
              <div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
                <p className="text-xs text-gray-400">
                  &copy; {new Date().getFullYear()} Tascal. All rights reserved.
                </p>
                {isFree && (
                  <p className="text-xs text-gray-400">
                    広告を非表示にするには{" "}
                    <Link
                      to="/plans"
                      className="text-primary-600 underline hover:text-primary-700"
                    >
                      Proプランにアップグレード
                    </Link>
                  </p>
                )}
              </div>
            </div>
          </footer>
        )}

        {/* ── Native Mobile Bottom Tab Bar ── */}
        {showMobileBottomNav && (
          <nav
            className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <div className="flex items-stretch">
              {TAB_ITEMS.map((item) => {
                const isActive =
                  item.to === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={[
                      "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors",
                      item.primary
                        ? "text-primary-600"
                        : isActive
                        ? "text-primary-700"
                        : "text-gray-500 hover:text-gray-800",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "flex items-center justify-center rounded-xl p-1",
                        item.primary
                          ? "bg-primary-600 text-white"
                          : isActive
                          ? "bg-primary-50"
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {item.icon}
                    </span>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </nav>
        )}
      </div>
    </>
  );
}
