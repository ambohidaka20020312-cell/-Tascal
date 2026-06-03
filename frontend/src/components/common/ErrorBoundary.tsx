import React from "react";

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

export default class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--bg-primary)] px-4">
          <p className="text-sm tracking-widest uppercase text-[var(--text-primary)] mb-3">
            Something went wrong
          </p>
          {this.state.error && (
            <p className="text-xs text-[var(--text-muted)] mb-6 max-w-xs text-center">
              {this.state.error.message}
            </p>
          )}
          <button
            onClick={() => window.location.reload()}
            className="text-xs tracking-[0.2em] uppercase border border-[var(--border)] text-[var(--text-primary)] px-4 py-2 hover:bg-[var(--bg-secondary)] transition-colors"
          >
            再読み込み
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
