import React from "react";
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
import ErrorBoundary from "./components/common/ErrorBoundary";
import ErrorPage from "./pages/ErrorPage";
import OnboardingWizard from "./components/onboarding/OnboardingWizard";
import { useOnboarding } from "./hooks/useOnboarding";

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated() ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { isOnboardingOpen, complete, skip } = useOnboarding(isAuthenticated());

  return (
    <ErrorBoundary>
      {isOnboardingOpen && (
        <OnboardingWizard onComplete={complete} onSkip={skip} />
      )}
      <Routes>
      {/* 認証不要ページ — AppLayoutなし */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* 認証必要ページ — AppLayoutでラップ */}
      <Route
        path="/"
        element={
          <PrivateRoute>
            <AppLayout>
              <DashboardPage />
            </AppLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/calendar"
        element={
          <PrivateRoute>
            <AppLayout>
              <CalendarPage />
            </AppLayout>
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
      <Route path="*" element={<ErrorPage code={404} message="Page not found" />} />
    </Routes>
    </ErrorBoundary>
  );
}
