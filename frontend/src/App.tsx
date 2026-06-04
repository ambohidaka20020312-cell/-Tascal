import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./store/authStore";
import AppLayout from "./components/layout/AppLayout";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import CalendarPage from "./pages/CalendarPage";
import SubscriptionPage from "./pages/SubscriptionPage";
import InsightsPage from "./pages/InsightsPage";
import SettingsPage from "./pages/SettingsPage";
import AccountPage from "./pages/AccountPage";
import CookieConsent from "./components/legal/CookieConsent";
import OnboardingWizard from "./components/onboarding/OnboardingWizard";
import UpgradePrompt from "./components/subscription/UpgradePrompt";
import PrivacyPolicyPage from "./pages/legal/PrivacyPolicyPage";
import TermsOfServicePage from "./pages/legal/TermsOfServicePage";
import CookiePolicyPage from "./pages/legal/CookiePolicyPage";
import { OfflineIndicator } from "./components/common/OfflineIndicator";

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

export default function App() {
  return (
    <>
    <OfflineIndicator />
    <CookieConsent />
    <GlobalUpgradeListener />
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
                <DashboardPage />
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
                <CalendarPage />
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
              <SubscriptionPage />
            </AppLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/plans"
        element={
          <PrivateRoute>
            <AppLayout>
              <SubscriptionPage />
            </AppLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/insights"
        element={
          <PrivateRoute>
            <AppLayout>
              <InsightsPage />
            </AppLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <PrivateRoute>
            <AppLayout>
              <SettingsPage />
            </AppLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/account"
        element={
          <PrivateRoute>
            <AppLayout>
              <AccountPage />
            </AppLayout>
          </PrivateRoute>
        }
      />
      <Route path="/privacy" element={<PrivacyPolicyPage />} />
      <Route path="/terms" element={<TermsOfServicePage />} />
      <Route path="/cookies" element={<CookiePolicyPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  );
}
