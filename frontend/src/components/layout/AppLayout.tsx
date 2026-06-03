import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../../store/authStore";
import { usePlan } from "../../hooks/usePlan";
import { useViewport } from "../../hooks/useViewport";
import AdBanner from "../ads/AdBanner";
import AdScript from "../ads/AdScript";
import TaskForm from "../tasks/TaskForm";
import FocusOverlay from "../focus/FocusOverlay";
import { useFocusStore } from "../../store/focusStore";
import LanguageSwitcher from "../common/LanguageSwitcher";

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

// ── Icon helpers ──
function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg className={`w-6 h-6 ${active ? "text-primary-600" : "text-gray-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
}

function CalendarIcon({ active }: { active: boolean }) {
  return (
    <svg className={`w-6 h-6 ${active ? "text-primary-600" : "text-gray-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function PlansIcon({ active }: { active: boolean }) {
  return (
    <svg className={`w-6 h-6 ${active ? "text-primary-600" : "text-gray-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  );
}

function ProfileIcon({ active }: { active: boolean }) {
  return (
    <svg className={`w-6 h-6 ${active ? "text-primary-600" : "text-gray-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

function LogoIcon() {
  return (
    <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  );
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { t } = useTranslation();
  const focusActive = useFocusStore((s) => s.isActive);
  const { user, logout } = useAuthStore();
  const { plan, isFree } = usePlan();
  const { pathname } = useLocation();
  const [showAddTask, setShowAddTask] = useState(false);

  const { deviceType, hasDynamicIsland, safeArea } = useViewport();

  const isPhone = deviceType === "phone-small" || deviceType === "phone" || deviceType === "phone-large";
  const isTablet = deviceType === "tablet";
  const isDesktop = deviceType === "desktop";
  const isUltrawide = deviceType === "ultrawide";
  const showSidebar = isTablet || isDesktop || isUltrawide;

  // sidebar width: tablet uses narrower fixed side nav, desktop 240px
  const sidebarWidth = isTablet ? 220 : 240;

  // Dynamic Island: force top safe area to 54px
  const topSafeArea = hasDynamicIsland ? 54 : safeArea.top;

  const isActive = (to: string) =>
    to === "/" ? pathname === "/" : pathname.startsWith(to);

  const SIDEBAR_NAV = [
    { label: t('nav.today'), to: "/", Icon: HomeIcon },
    { label: t('nav.calendar'), to: "/calendar", Icon: CalendarIcon },
    { label: t('subscription.title'), to: "/plans", Icon: PlansIcon },
  ];

  return (
    <>
      <AdScript />

      <div
        className={`flex min-h-screen bg-gray-50${hasDynamicIsland ? " has-dynamic-island" : ""}`}
        style={{ paddingTop: topSafeArea > 0 ? `${topSafeArea}px` : undefined }}
      >
        {/* ── Sidebar (tablet+) ── */}
        {showSidebar && (
          <aside
            className="flex flex-col fixed left-0 top-0 h-full z-40 bg-white border-r border-gray-200 shadow-sm"
            style={{
              width: sidebarWidth,
              paddingTop: topSafeArea > 0 ? `${topSafeArea}px` : undefined,
            }}
          >
            {/* Sidebar logo */}
            <div className="flex items-center gap-2 px-4 py-4 border-b border-gray-100">
              <Link to="/" className="flex items-center gap-2 text-primary-600 font-bold text-xl hover:text-primary-700 shrink-0">
                <LogoIcon />
                {(isDesktop || isUltrawide) && <span>Tascal</span>}
              </Link>
            </div>

            {/* Nav items */}
            <nav className="flex-1 py-4 space-y-1 px-2">
              {SIDEBAR_NAV.map(({ label, to, Icon }) => {
                const active = isActive(to);
                const showLabel = isDesktop || isUltrawide;
                return (
                  <Link
                    key={to}
                    to={to}
                    className={[
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors min-h-touch",
                      active
                        ? "bg-primary-50 text-primary-700"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
                      !showLabel ? "justify-center" : "",
                    ].join(" ")}
                    title={!showLabel ? label : undefined}
                  >
                    <Icon active={active} />
                    {showLabel && (
                      <span className="text-sm font-medium">{label}</span>
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* User + logout */}
            {user && (
              <div className={`border-t border-gray-100 p-3 ${!(isDesktop || isUltrawide) ? "flex flex-col items-center gap-2" : ""}`}>
                {(isDesktop || isUltrawide) && (
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{user.name}</p>
                      <PlanBadge plan={plan} />
                    </div>
                  </div>
                )}
                <button
                  onClick={logout}
                  className={[
                    "w-full rounded-lg border border-gray-200 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100",
                    !(isDesktop || isUltrawide) ? "px-1" : "px-3",
                  ].join(" ")}
                  title={!(isDesktop || isUltrawide) ? t('auth.logout') : undefined}
                >
                  {!(isDesktop || isUltrawide) ? (
                    <svg className="w-4 h-4 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  ) : t('auth.logout')}
                </button>
              </div>
            )}
          </aside>
        )}

        {/* ── Main area ── */}
        <div
          className="flex flex-col flex-1 min-h-screen"
          style={{ marginLeft: showSidebar ? sidebarWidth : 0 }}
        >
          {/* Ultrawide: center content */}
          <div className={isUltrawide ? "max-w-7xl mx-auto w-full flex flex-col flex-1" : "flex flex-col flex-1"}>
            {/* Mobile header (phone only) */}
            {isPhone && (
              <header className="sticky top-0 z-30 border-b border-gray-200 bg-white shadow-sm">
                <div
                  className="flex items-center justify-between px-4 py-3"
                  style={{ fontSize: deviceType === "phone-small" ? "14px" : undefined }}
                >
                  <Link to="/" className="flex items-center gap-2 text-xl font-bold text-primary-600">
                    <LogoIcon />
                    Tascal
                  </Link>
                  {user && (
                    <div className="flex items-center gap-2">
                      <LanguageSwitcher />
                      <PlanBadge plan={plan} />
                    </div>
                  )}
                </div>
              </header>
            )}

            {/* Page content */}
            <main
              className="flex-1"
              style={{
                paddingLeft: "var(--content-padding-x)",
                paddingRight: "var(--content-padding-x)",
                paddingTop: "var(--content-padding-y)",
                paddingBottom: isPhone
                  ? `calc(var(--bottom-nav-height) + env(safe-area-inset-bottom, 0px) + 1rem)`
                  : "var(--content-padding-y)",
              }}
            >
              {children}
            </main>

            {/* Footer (tablet+) */}
            {showSidebar && (
              <footer className="border-t border-gray-200 bg-white">
                {isFree && (
                  <div className="flex justify-center px-4 pt-4">
                    <AdBanner
                      slot={import.meta.env.VITE_ADSENSE_FOOTER_SLOT ?? "0000000000"}
                      format="leaderboard"
                      className="w-full max-w-[728px]"
                    />
                  </div>
                )}
                <div className="px-4 py-4 sm:px-6 lg:px-8">
                  <div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
                    <p className="text-xs text-gray-400">
                      &copy; {new Date().getFullYear()} Tascal. All rights reserved.
                    </p>
                    {isFree && (
                      <p className="text-xs text-gray-400">
                        広告を非表示にするには{" "}
                        <Link to="/plans" className="text-primary-600 underline hover:text-primary-700">
                          Proプランにアップグレード
                        </Link>
                      </p>
                    )}
                  </div>
                </div>
              </footer>
            )}
          </div>
        </div>
      </div>

      {/* ── Mobile Bottom Tab Bar (phone only) ── */}
      {isPhone && (
        <nav
          className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 pb-safe"
          style={{ height: `calc(var(--bottom-nav-height) + env(safe-area-inset-bottom, 0px))` }}
        >
          <div className="flex items-center h-[var(--bottom-nav-height)]">
            {/* Home */}
            <Link
              to="/"
              className={[
                "flex-1 flex flex-col items-center justify-center py-2 min-h-touch gap-0.5 transition-colors",
                isActive("/") ? "text-primary-600" : "text-gray-400",
              ].join(" ")}
            >
              <HomeIcon active={isActive("/")} />
              <span className={`font-medium ${deviceType === "phone-small" ? "text-[9px]" : "text-[10px]"}`}>{t('nav.today')}</span>
            </Link>

            {/* Calendar */}
            <Link
              to="/calendar"
              className={[
                "flex-1 flex flex-col items-center justify-center py-2 min-h-touch gap-0.5 transition-colors",
                isActive("/calendar") ? "text-primary-600" : "text-gray-400",
              ].join(" ")}
            >
              <CalendarIcon active={isActive("/calendar")} />
              <span className={`font-medium ${deviceType === "phone-small" ? "text-[9px]" : "text-[10px]"}`}>{t('nav.calendar')}</span>
            </Link>

            {/* Add task FAB */}
            <button
              onClick={() => setShowAddTask(true)}
              className="flex-1 flex flex-col items-center justify-center py-2 min-h-touch gap-0.5"
              aria-label={t('task.add')}
            >
              <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center shadow-md -mt-4">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <span className={`font-medium text-gray-400 mt-1 ${deviceType === "phone-small" ? "text-[9px]" : "text-[10px]"}`}>{t('task.add')}</span>
            </button>

            {/* Plans */}
            <Link
              to="/plans"
              className={[
                "flex-1 flex flex-col items-center justify-center py-2 min-h-touch gap-0.5 transition-colors",
                isActive("/plans") ? "text-primary-600" : "text-gray-400",
              ].join(" ")}
            >
              <PlansIcon active={isActive("/plans")} />
              <span className={`font-medium ${deviceType === "phone-small" ? "text-[9px]" : "text-[10px]"}`}>{t('subscription.title')}</span>
            </Link>

            {/* Profile / Logout */}
            <button
              onClick={logout}
              className="flex-1 flex flex-col items-center justify-center py-2 min-h-touch gap-0.5 text-gray-400"
            >
              <ProfileIcon active={false} />
              <span className={`font-medium ${deviceType === "phone-small" ? "text-[9px]" : "text-[10px]"}`}>{t('auth.logout')}</span>
            </button>
          </div>
        </nav>
      )}

      {/* Add task modal (triggered by "+" tab) */}
      {showAddTask && (
        <TaskForm
          onClose={() => setShowAddTask(false)}
          defaultDate={new Date().toISOString().split("T")[0]}
        />
      )}

      {focusActive && <FocusOverlay />}
    </>
  );
}
