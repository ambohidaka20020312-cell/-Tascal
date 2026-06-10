import React, { lazy, Suspense, useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./store/authStore";
import AppLayout from "./components/layout/AppLayout";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import NotFoundPage from "./pages/NotFoundPage";
import LandingPage from "./pages/LandingPage";
import DashboardPage from "./pages/DashboardPage";
import SubscriptionPage from "./pages/SubscriptionPage";
import AccountPage from "./pages/AccountPage";
import TeamPage from "./pages/TeamPage";
import CookieConsent from "./components/legal/CookieConsent";
import UpgradePrompt from "./components/subscription/UpgradePrompt";
import PrivacyPolicyPage from "./pages/legal/PrivacyPolicyPage";
import TermsOfServicePage from "./pages/legal/TermsOfServicePage";
import CookiePolicyPage from "./pages/legal/CookiePolicyPage";
import SpecifiedCommercialTransactionsPage from "./pages/legal/SpecifiedCommercialTransactionsPage";
import { OfflineIndicator } from "./components/common/OfflineIndicator";
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import { ToastProvider } from "./components/common/Toast";
import ShortcutsOverlay from "./components/common/ShortcutsOverlay";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import MiniTimer from "./components/timer/MiniTimer";
import AdminDashboard from "./pages/AdminDashboard";
import AdminUsers from "./pages/AdminUsers";
import ShareTargetPage from "./pages/ShareTargetPage";
import CheckEmailPage from "./pages/CheckEmailPage";
import ResendVerifyPage from "./pages/ResendVerifyPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import JoinTeamPage from "./pages/JoinTeamPage";

// Lazy-loaded heavy pages
const CalendarPage = lazy(() => import("./pages/CalendarPage"));
const InsightsPage = lazy(() => import("./pages/InsightsPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const ChatPage = lazy(() => import("./pages/ChatPage"));
const OrgDashboardPage = lazy(() => import("./pages/OrgDashboardPage"));
const OrgTaskDistributionPage = lazy(() => import("./pages/OrgTaskDistributionPage"));

function PageSkeleton() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="w-6 h-6 border border-[var(--border)] border-t-[var(--text-muted)] rounded-full animate-spin" />
    </div>
  );
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated() ? <>{children}</> : <Navigate to="/login" replace />;
}

function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated() ? <Navigate to="/app/tasks" replace /> : <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  if (!user.is_admin) return <Navigate to="/app/tasks" replace />;
  return <>{children}</>;
}

function OnboardingGate({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function GlobalUpgradeListener() {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<"task_limit" | "ai_limit" | "insights" | "generic">("generic");
  useEffect(() => {
    const handler = (e: Event) => {
      const code = (e as CustomEvent).detail?.code as string ?? "";
      if (code === "TASK_LIMIT") setReason("task_limit");
      else if (code === "AI_LIMIT") setReason("ai_limit");
      else if (code === "INSIGHTS_PRO") setReason("insights");
      else setReason("generic");
      setOpen(true);
    };
    window.addEventListener("upgrade-required", handler);
    return () => window.removeEventListener("upgrade-required", handler);
  }, []);
  return <UpgradePrompt isOpen={open} onClose={() => setOpen(false)} reason={reason} />;
}

function AppShell({ children }: { children: React.ReactNode }) {
  useKeyboardShortcuts();
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* ランディングページ — 認証済みユーザーは /app/tasks へリダイレクト */}
      <Route
        path="/"
        element={
          <PublicOnlyRoute>
            <LandingPage />
          </PublicOnlyRoute>
        }
      />

      {/* 認証不要ページ — AppLayoutなし */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* メール認証フロー */}
      <Route path="/check-email" element={<CheckEmailPage />} />
      <Route path="/resend-verify" element={<ResendVerifyPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/join-team" element={<JoinTeamPage />} />

      {/* PWA Share Target */}
      <Route path="/share-target" element={<ShareTargetPage />} />

      {/* Team invite acceptance */}
      <Route path="/join-team" element={<JoinTeamPage />} />

      {/* 法的ページ */}
      <Route path="/privacy" element={<PrivacyPolicyPage />} />
      <Route path="/terms" element={<TermsOfServicePage />} />
      <Route path="/cookies" element={<CookiePolicyPage />} />
      <Route path="/tokusho" element={<SpecifiedCommercialTransactionsPage />} />

      {/* アプリ本体 — /app/* プレフィックス、認証必須 */}
      <Route
        path="/app/tasks"
        element={
          <PrivateRoute>
            <OnboardingGate>
              <AppLayout>
                <ErrorBoundary>
                  <DashboardPage />
                </ErrorBoundary>
              </AppLayout>
            </OnboardingGate>
          </PrivateRoute>
        }
      />
      <Route
        path="/app/calendar"
        element={
          <PrivateRoute>
            <OnboardingGate>
              <AppLayout>
                <ErrorBoundary>
                  <Suspense fallback={<PageSkeleton />}>
                    <CalendarPage />
                  </Suspense>
                </ErrorBoundary>
              </AppLayout>
            </OnboardingGate>
          </PrivateRoute>
        }
      />
      <Route
        path="/app/plans"
        element={
          <PrivateRoute>
            <AppLayout>
              <ErrorBoundary>
                <SubscriptionPage />
              </ErrorBoundary>
            </AppLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/app/subscription"
        element={
          <PrivateRoute>
            <AppLayout>
              <ErrorBoundary>
                <SubscriptionPage />
              </ErrorBoundary>
            </AppLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/app/insights"
        element={
          <PrivateRoute>
            <AppLayout>
              <ErrorBoundary>
                <Suspense fallback={<PageSkeleton />}>
                  <InsightsPage />
                </Suspense>
              </ErrorBoundary>
            </AppLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/app/settings"
        element={
          <PrivateRoute>
            <AppLayout>
              <ErrorBoundary>
                <Suspense fallback={<PageSkeleton />}>
                  <SettingsPage />
                </Suspense>
              </ErrorBoundary>
            </AppLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/app/account"
        element={
          <PrivateRoute>
            <AppLayout>
              <ErrorBoundary>
                <AccountPage />
              </ErrorBoundary>
            </AppLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/app/team"
        element={
          <PrivateRoute>
            <AppLayout>
              <ErrorBoundary>
                <TeamPage />
              </ErrorBoundary>
            </AppLayout>
          </PrivateRoute>
        }
      />

      {/* チャット */}
      <Route
        path="/app/chat"
        element={
          <PrivateRoute>
            <AppLayout>
              <ErrorBoundary>
                <Suspense fallback={<PageSkeleton />}>
                  <ChatPage />
                </Suspense>
              </ErrorBoundary>
            </AppLayout>
          </PrivateRoute>
        }
      />

      {/* 組織ダッシュボード */}
      <Route
        path="/org/:slug"
        element={
          <PrivateRoute>
            <ErrorBoundary>
              <Suspense fallback={<PageSkeleton />}>
                <OrgDashboardPage />
              </Suspense>
            </ErrorBoundary>
          </PrivateRoute>
        }
      />
      <Route
        path="/org/:slug/distribute"
        element={
          <PrivateRoute>
            <ErrorBoundary>
              <Suspense fallback={<PageSkeleton />}>
                <OrgTaskDistributionPage />
              </Suspense>
            </ErrorBoundary>
          </PrivateRoute>
        }
      />

      {/* 管理者専用ページ */}
      <Route
        path="/app/admin"
        element={
          <AdminRoute>
            <ErrorBoundary>
              <AdminDashboard />
            </ErrorBoundary>
          </AdminRoute>
        }
      />
      <Route
        path="/app/admin/users"
        element={
          <AdminRoute>
            <ErrorBoundary>
              <AdminUsers />
            </ErrorBoundary>
          </AdminRoute>
        }
      />

      {/* /app/* の未マッチ → 認証済みなら /app/tasks、未認証なら /login */}
      <Route path="/app/*" element={<Navigate to="/app/tasks" replace />} />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppShell>
        <OfflineIndicator />
        <MiniTimer />
        <CookieConsent />
        <GlobalUpgradeListener />
        <ShortcutsOverlay />
        <AppRoutes />
      </AppShell>
    </ToastProvider>
  );
}
