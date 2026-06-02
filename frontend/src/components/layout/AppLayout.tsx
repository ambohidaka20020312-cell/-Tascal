import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { usePlan } from "../../hooks/usePlan";
import AdBanner from "../ads/AdBanner";
import AdScript from "../ads/AdScript";
import TaskForm from "../tasks/TaskForm";

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

const SIDEBAR_NAV = [
  { label: "ダッシュボード", to: "/", Icon: HomeIcon },
  { label: "カレンダー", to: "/calendar", Icon: CalendarIcon },
  { label: "プラン", to: "/plans", Icon: PlansIcon },
];

export default function AppLayout({ children }: AppLayoutProps) {
  const { user, logout } = useAuthStore();
  const { plan, isFree } = usePlan();
  const { pathname } = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);

  const isActive = (to: string) =>
    to === "/" ? pathname === "/" : pathname.startsWith(to);

  return (
    <>
      <AdScript />

      <div className="flex min-h-screen bg-gray-50">
        {/* ── Tablet/PC Sidebar (md+) ── */}
        <aside
          className={[
            "hidden md:flex flex-col fixed left-0 top-0 h-full z-40 bg-white border-r border-gray-200 shadow-sm transition-all duration-200",
            sidebarCollapsed ? "w-16" : "w-56",
          ].join(" ")}
        >
          {/* Sidebar logo */}
          <div className={`flex items-center gap-2 px-4 py-4 border-b border-gray-100 ${sidebarCollapsed ? "justify-center" : ""}`}>
            <Link to="/" className="flex items-center gap-2 text-primary-600 font-bold text-xl hover:text-primary-700 shrink-0">
              <LogoIcon />
              {!sidebarCollapsed && <span>Tascal</span>}
            </Link>
          </div>

          {/* Collapse toggle */}
          <button
            onClick={() => setSidebarCollapsed((c) => !c)}
            className="absolute -right-3 top-[4.5rem] w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:bg-gray-50"
            aria-label={sidebarCollapsed ? "展開" : "折りたたむ"}
          >
            <svg className={`w-3 h-3 text-gray-500 transition-transform ${sidebarCollapsed ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Nav items */}
          <nav className="flex-1 py-4 space-y-1 px-2">
            {SIDEBAR_NAV.map(({ label, to, Icon }) => {
              const active = isActive(to);
              return (
                <Link
                  key={to}
                  to={to}
                  className={[
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors min-h-touch",
                    active
                      ? "bg-primary-50 text-primary-700"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
                    sidebarCollapsed ? "justify-center" : "",
                  ].join(" ")}
                  title={sidebarCollapsed ? label : undefined}
                >
                  <Icon active={active} />
                  {!sidebarCollapsed && (
                    <span className="text-sm font-medium">{label}</span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User + logout */}
          {user && (
            <div className={`border-t border-gray-100 p-3 ${sidebarCollapsed ? "flex flex-col items-center gap-2" : ""}`}>
              {!sidebarCollapsed && (
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
                  sidebarCollapsed ? "px-1" : "px-3",
                ].join(" ")}
                title={sidebarCollapsed ? "ログアウト" : undefined}
              >
                {sidebarCollapsed ? (
                  <svg className="w-4 h-4 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                ) : "ログアウト"}
              </button>
            </div>
          )}
        </aside>

        {/* ── Main area ── */}
        <div className={`flex flex-col flex-1 min-h-screen transition-all duration-200 ${sidebarCollapsed ? "md:ml-16" : "md:ml-56"}`}>
          {/* Mobile header (hidden on md+) */}
          <header className="md:hidden sticky top-0 z-30 border-b border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between px-4 py-3">
              <Link to="/" className="flex items-center gap-2 text-xl font-bold text-primary-600">
                <LogoIcon />
                Tascal
              </Link>
              {user && (
                <div className="flex items-center gap-2">
                  <PlanBadge plan={plan} />
                </div>
              )}
            </div>
          </header>

          {/* Page content — pb-24 on mobile to clear bottom tab bar */}
          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 pb-24 md:pb-6">
            {children}
          </main>

          {/* Footer (md+) */}
          <footer className="hidden md:block border-t border-gray-200 bg-white">
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
        </div>
      </div>

      {/* ── Mobile Bottom Tab Bar (hidden on md+) ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 pb-safe">
        <div className="flex items-center">
          {/* Home */}
          <Link
            to="/"
            className={[
              "flex-1 flex flex-col items-center justify-center py-2 min-h-touch gap-0.5 transition-colors",
              isActive("/") ? "text-primary-600" : "text-gray-400",
            ].join(" ")}
          >
            <HomeIcon active={isActive("/")} />
            <span className="text-[10px] font-medium">ホーム</span>
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
            <span className="text-[10px] font-medium">カレンダー</span>
          </Link>

          {/* Add task FAB */}
          <button
            onClick={() => setShowAddTask(true)}
            className="flex-1 flex flex-col items-center justify-center py-2 min-h-touch gap-0.5"
            aria-label="タスク追加"
          >
            <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center shadow-md -mt-4">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <span className="text-[10px] font-medium text-gray-400 mt-1">追加</span>
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
            <span className="text-[10px] font-medium">プラン</span>
          </Link>

          {/* Profile / Logout */}
          <button
            onClick={logout}
            className="flex-1 flex flex-col items-center justify-center py-2 min-h-touch gap-0.5 text-gray-400"
          >
            <ProfileIcon active={false} />
            <span className="text-[10px] font-medium">ログアウト</span>
          </button>
        </div>
      </nav>

      {/* Add task modal (triggered by "+" tab) */}
      {showAddTask && (
        <TaskForm
          onClose={() => setShowAddTask(false)}
          defaultDate={new Date().toISOString().split("T")[0]}
        />
      )}
    </>
  );
}
