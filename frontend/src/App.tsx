import React, { lazy, Suspense, useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./store/authStore";
import AppLayout from "./components/layout/AppLayout";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import SubscriptionPage from "./pages/SubscriptionPage";
import AccountPage from "./pages/AccountPage";
import TeamPage from "./pages/TeamPage";
import CookieConsent from "./components/legal/CookieConsent";
import OnboardingWizard from "./components/onboarding/OnboardingWizard";
import UpgradePrompt from "./components/subscription/UpgradePrompt";
import PrivacyPolicyPage from "./pages/legal/PrivacyPolicyPage";
import TermsOfServicePage from "./pages/legal/TermsOfServicePage";
import CookiePolicyPage from "./pages/legal/CookiePolicyPage";
import { OfflineIndicator } from "./components/common/OfflineIndicator";
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import { ToastProvider } from "./components/common/Toast";
import ShortcutsOverlay from "./components/common/ShortcutsOverlay";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";

// Lazy-loaded heavy pages
const CalendarPage = lazy(() => import("./pages/CalendarPage"));
const InsightsPage = lazy(() => import("./pages/InsightsPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));

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

function OnboardingGate({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const [dismissed, setDismissed] = useState(false);

  const needsOnboarding = user && !user.onboarding_completed && !dismissed;

  if (needsOnboarding) {
    return <OnboardingWizard onComplete={() => setDismissed(true)} />;
  }

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

export default function App() {
  return (
    <ToastProvider>
      <AppShell>
      <OfflineIndicator />
      <CookieConsent />
      <GlobalUpgradeListener />
      <ShortcutsOverlay />
      <Routes>
        {/* 認証不要ページ — AppLayoutなし */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* 認証必要ページ — AppLayoutでラップ */}
        <Route
          path="/"
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
          path="/calendar"
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
          path="/subscription"
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
          path="/plans"
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
          path="/insights"
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
          path="/settings"
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
          path="/account"
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
          path="/team"
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
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/terms" element={<TermsOfServicePage />} />
        <Route path="/cookies" element={<CookiePolicyPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </AppShell>
    </ToastProvider>
  );
}
