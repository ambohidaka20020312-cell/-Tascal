import React from "react";
import * as Sentry from "@sentry/react";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

function DefaultFallback({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] px-6 text-center">
      <div className="w-12 h-12 border border-[var(--border)] rounded-2xl flex items-center justify-center mb-5">
        <svg
          className="w-6 h-6 text-[var(--text-subtle)]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
          />
        </svg>
      </div>
      <p className="text-base font-light tracking-wide text-[var(--text-primary)] mb-2">
        予期しないエラーが発生しました
      </p>
      <p className="text-xs text-[var(--text-subtle)] mb-6">
        ページを再読み込みするか、再試行してください
      </p>
      <button
        onClick={onRetry}
        className="px-5 py-2 border border-[var(--border)] text-sm text-[var(--text-muted)] tracking-wide hover:border-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
      >
        再試行
      </button>
    </div>
  );
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary:", error, info);
    Sentry.captureException(error, { extra: { componentStack: info.componentStack } });
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <DefaultFallback onRetry={() => this.setState({ hasError: false })} />
        )
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
