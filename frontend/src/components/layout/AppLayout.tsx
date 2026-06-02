import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { usePlan } from "../../hooks/usePlan";
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

export default function AppLayout({ children }: AppLayoutProps) {
  const { user, logout } = useAuthStore();
  const { plan, isFree } = usePlan();
  const { pathname } = useLocation();

  return (
    <>
      {/* Inject AdSense script for free users only */}
      <AdScript />

      <div className="flex min-h-screen flex-col bg-gray-50">
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

            {/* Navigation */}
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

          {/* Mobile navigation */}
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
        </header>

        {/* ── Main content ── */}
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>

        {/* ── Footer ── */}
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
      </div>
    </>
  );
}
