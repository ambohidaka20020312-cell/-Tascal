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
  free: "bg-[var(--bg-tertiary)] text-[var(--text-muted)]",
  pro: "bg-[var(--accent)] text-white dark:text-[#0f0f0f]",
  team: "bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border)]",
};

const PLAN_LABEL: Record<string, string> = {
  free: "Free",
  pro: "Pro",
  team: "Team",
};

function PlanBadge({ plan }: { plan: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold tracking-wide ${PLAN_BADGE_CLASSES[plan] ?? PLAN_BADGE_CLASSES.free}`}
    >
      {PLAN_LABEL[plan] ?? "Free"}
    </span>
  );
}

// ── Icon helpers ──
function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg className={`w-6 h-6 ${active ? "text-[var(--text-primary)]" : "text-[var(--text-subtle)]"}`} fill={active ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
}

function CalendarIcon({ active }: { active: boolean }) {
  return (
    <svg className={`w-6 h-6 ${active ? "text-[var(--text-primary)]" : "text-[var(--text-subtle)]"}`} fill={active ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function PlansIcon({ active }: { active: boolean }) {
  return (
    <svg className={`w-6 h-6 ${active ? "text-[var(--text-primary)]" : "text-[var(--text-subtle)]"}`} fill={active ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  );
}

function TeamIcon({ active }: { active: boolean }) {
  return (
    <svg className={`w-6 h-6 ${active ? "text-[var(--text-primary)]" : "text-[var(--text-subtle)]"}`} fill={active ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6 5.87v-2a4 4 0 00-2-3.46M15 7a4 4 0 11-8 0 4 4 0 018 0zm6 4a3 3 0 11-6 0 3 3 0 016 0zM3 11a3 3 0 116 0 3 3 0 01-6 0z" />
    </svg>
  );
}

function ProfileIcon({ active }: { active: boolean }) {
  return (
    <svg className={`w-6 h-6 ${active ? "text-[var(--text-primary)]" : "text-[var(--text-subtle)]"}`} fill={active ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
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

  const sidebarWidth = isTablet ? 220 : 240;
  const topSafeArea = hasDynamicIsland ? 54 : safeArea.top;

  const isActive = (to: string) =>
    to === "/" ? pathname === "/" : pathname.startsWith(to);

  const isTeamPlan = plan === "team";

  const SIDEBAR_NAV = [
    { label: t('nav.today'), to: "/", Icon: HomeIcon },
    { label: t('nav.calendar'), to: "/calendar", Icon: CalendarIcon },
    { label: t('subscription.title'), to: "/plans", Icon: PlansIcon },
    { label: "チーム", to: isTeamPlan ? "/team" : "/subscription", Icon: TeamIcon, dimmed: !isTeamPlan },
  ];

  return (
    <>
      <AdScript />

      <div
        className={`flex min-h-screen bg-[var(--bg-primary)]${hasDynamicIsland ? " has-dynamic-island" : ""}`}
        style={{ paddingTop: topSafeArea > 0 ? `${topSafeArea}px` : undefined }}
      >
        {/* ── Sidebar (tablet+) ── */}
        {showSidebar && (
          <aside
            className="flex flex-col fixed left-0 top-0 h-full z-40 bg-[var(--bg-secondary)] border-r border-[var(--border)]"
            style={{
              width: sidebarWidth,
              paddingTop: topSafeArea > 0 ? `${topSafeArea}px` : undefined,
            }}
          >
            {/* Sidebar logo */}
            <div className="flex items-center gap-2 px-5 py-7">
              <Link to="/" aria-label="Tascal ホームへ" className="flex items-center gap-2 text-[var(--text-primary)] hover:opacity-70 shrink-0">
                {(isDesktop || isUltrawide) ? (
                  <span className="text-sm font-semibold tracking-[0.25em] uppercase">TASCAL</span>
                ) : (
                  <span className="text-sm font-semibold tracking-[0.2em] uppercase">T</span>
                )}
              </Link>
            </div>

            {/* Nav items */}
            <nav aria-label="メインナビゲーション" className="flex-1 py-4 space-y-0.5 px-2">
              {SIDEBAR_NAV.map(({ label, to, Icon, dimmed }) => {
                const active = isActive(to) && !dimmed;
                const showLabel = isDesktop || isUltrawide;
                return (
                  <Link
                    key={label}
                    to={to}
                    aria-current={active ? "page" : undefined}
                    className={[
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors min-h-touch relative",
                      dimmed
                        ? "opacity-40 cursor-default"
                        : active
                          ? "text-[var(--text-primary)] font-medium"
                          : "text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]",
                      !showLabel ? "justify-center" : "",
                    ].join(" ")}
                    title={!showLabel ? label : undefined}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-[var(--text-primary)] rounded-r-full" />
                    )}
                    <Icon active={active} />
                    {showLabel && (
                      <span className="text-sm font-medium tracking-wide">{label}</span>
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* User + logout */}
            {user && (
              <div className={`border-t border-[var(--border)] p-3 ${!(isDesktop || isUltrawide) ? "flex flex-col items-center gap-2" : ""}`}>
                {(isDesktop || isUltrawide) && (
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate tracking-wide">{user.name}</p>
                      <PlanBadge plan={plan} />
                    </div>
                  </div>
                )}
                <button
                  onClick={logout}
                  aria-label={t('auth.logout')}
                  className={[
                    "w-full rounded-lg border border-[var(--border)] py-1.5 text-xs font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]",
                    !(isDesktop || isUltrawide) ? "px-1" : "px-3",
                  ].join(" ")}
                  title={!(isDesktop || isUltrawide) ? t('auth.logout') : undefined}
                >
                  {!(isDesktop || isUltrawide) ? (
                    <svg className="w-4 h-4 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
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
              <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--bg-primary)]">
                <div
                  className="flex items-center justify-between px-4 py-3"
                  style={{ fontSize: deviceType === "phone-small" ? "14px" : undefined }}
                >
                  <Link to="/" aria-label="Tascal ホームへ" className="text-[var(--text-primary)] font-bold">
                    <span className="text-xl font-bold tracking-widest uppercase">TASCAL</span>
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
              className="flex-1 bg-[var(--bg-primary)]"
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
              <footer className="border-t border-[var(--border)] bg-[var(--bg-secondary)]">
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
                    <p className="text-xs text-[var(--text-subtle)] tracking-wide">
                      &copy; {new Date().getFullYear()} Tascal / NutriAI. All rights reserved.
                    </p>
                    <div className="flex items-center gap-3 flex-wrap justify-center">
                      <Link to="/privacy" className="text-xs text-[var(--text-subtle)] hover:text-[var(--text-muted)]">プライバシーポリシー</Link>
                      <Link to="/terms" className="text-xs text-[var(--text-subtle)] hover:text-[var(--text-muted)]">利用規約</Link>
                      <Link to="/tokusho" className="text-xs text-[var(--text-subtle)] hover:text-[var(--text-muted)]">特定商取引法</Link>
                      {isFree && (
                        <Link to="/plans" className="text-xs text-[var(--text-primary)] underline hover:opacity-70">
                          広告を非表示にする
                        </Link>
                      )}
                    </div>
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
          aria-label="メインナビゲーション"
          className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--bg-primary)]/90 backdrop-blur-sm border-t border-[var(--border)] pb-safe"
          style={{ height: `calc(var(--bottom-nav-height) + env(safe-area-inset-bottom, 0px))` }}
        >
          <div role="tablist" className="flex items-center h-[var(--bottom-nav-height)]">
            {/* Home */}
            <Link
              to="/"
              role="tab"
              aria-selected={isActive("/")}
              aria-current={isActive("/") ? "page" : undefined}
              className={[
                "flex-1 flex flex-col items-center justify-center py-2 min-h-touch gap-0.5 transition-colors",
                isActive("/") ? "text-[var(--text-primary)]" : "text-[var(--text-subtle)]",
              ].join(" ")}
            >
              <HomeIcon active={isActive("/")} />
              <span className={`font-medium tracking-wider uppercase ${deviceType === "phone-small" ? "text-[9px]" : "text-[10px]"}`}>{t('nav.today')}</span>
            </Link>

            {/* Calendar */}
            <Link
              to="/calendar"
              role="tab"
              aria-selected={isActive("/calendar")}
              aria-current={isActive("/calendar") ? "page" : undefined}
              className={[
                "flex-1 flex flex-col items-center justify-center py-2 min-h-touch gap-0.5 transition-colors",
                isActive("/calendar") ? "text-[var(--text-primary)]" : "text-[var(--text-subtle)]",
              ].join(" ")}
            >
              <CalendarIcon active={isActive("/calendar")} />
              <span className={`font-medium tracking-wider uppercase ${deviceType === "phone-small" ? "text-[9px]" : "text-[10px]"}`}>{t('nav.calendar')}</span>
            </Link>

            {/* Add task FAB */}
            <button
              onClick={() => setShowAddTask(true)}
              className="flex-1 flex flex-col items-center justify-center py-2 min-h-touch gap-0.5"
              aria-label={t('task.add')}
            >
              <div className="w-10 h-10 bg-[var(--accent)] rounded-full flex items-center justify-center -mt-4">
                <svg className="w-5 h-5 text-white dark:text-[#0f0f0f]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <span className={`font-medium text-[var(--text-subtle)] mt-1 tracking-wider uppercase ${deviceType === "phone-small" ? "text-[9px]" : "text-[10px]"}`}>{t('task.add')}</span>
            </button>

            {/* Plans */}
            <Link
              to="/plans"
              role="tab"
              aria-selected={isActive("/plans")}
              aria-current={isActive("/plans") ? "page" : undefined}
              className={[
                "flex-1 flex flex-col items-center justify-center py-2 min-h-touch gap-0.5 transition-colors",
                isActive("/plans") ? "text-[var(--text-primary)]" : "text-[var(--text-subtle)]",
              ].join(" ")}
            >
              <PlansIcon active={isActive("/plans")} />
              <span className={`font-medium tracking-wider uppercase ${deviceType === "phone-small" ? "text-[9px]" : "text-[10px]"}`}>{t('subscription.title')}</span>
            </Link>

            {/* Team */}
            <Link
              to={isTeamPlan ? "/team" : "/subscription"}
              role="tab"
              aria-selected={isTeamPlan && isActive("/team")}
              aria-current={isTeamPlan && isActive("/team") ? "page" : undefined}
              className={[
                "flex-1 flex flex-col items-center justify-center py-2 min-h-touch gap-0.5 transition-colors",
                !isTeamPlan
                  ? "opacity-40"
                  : isActive("/team") ? "text-[var(--text-primary)]" : "text-[var(--text-subtle)]",
              ].join(" ")}
            >
              <TeamIcon active={isTeamPlan && isActive("/team")} />
              <span className={`font-medium tracking-wider uppercase ${deviceType === "phone-small" ? "text-[9px]" : "text-[10px]"}`}>チーム</span>
            </Link>

            {/* Profile / Logout */}
            <button
              onClick={logout}
              role="tab"
              aria-selected={false}
              aria-label={t('auth.logout')}
              className="flex-1 flex flex-col items-center justify-center py-2 min-h-touch gap-0.5 text-[var(--text-subtle)]"
            >
              <ProfileIcon active={false} />
              <span className={`font-medium tracking-wider uppercase ${deviceType === "phone-small" ? "text-[9px]" : "text-[10px]"}`}>{t('auth.logout')}</span>
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
