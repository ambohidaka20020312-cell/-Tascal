import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

type ToastType = "success" | "error";

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const toast = useCallback(
    (message: string, type: ToastType = "success") => {
      const id = nextId++;
      setToasts((prev) => {
        const next = [...prev, { id, message, type }];
        // Limit to 3 visible at once — drop oldest
        return next.length > 3 ? next.slice(next.length - 3) : next;
      });
      const timer = setTimeout(() => dismiss(id), 3000);
      timers.current.set(id, timer);
    },
    [dismiss]
  );

  // Clean up all timers on unmount
  useEffect(() => {
    return () => {
      timers.current.forEach((t) => clearTimeout(t));
    };
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
}) {
  if (toasts.length === 0) return null;
  return (
    <div
      aria-live="polite"
      className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none"
    >
      {toasts.map((t) => (
        <ToastBadge key={t.id} item={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastBadge({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: (id: number) => void;
}) {
  const isError = item.type === "error";
  return (
    <div
      role="alert"
      className={[
        "pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg border",
        "bg-[var(--bg-secondary)] text-[var(--text-primary)] text-sm tracking-wide",
        "shadow-sm min-w-[220px] max-w-[320px]",
        isError
          ? "border-[var(--text-muted)] opacity-95"
          : "border-[var(--border)] opacity-90",
      ].join(" ")}
    >
      {/* Icon indicator */}
      <span
        className={[
          "w-1.5 h-1.5 rounded-full flex-shrink-0",
          isError ? "bg-[var(--text-primary)]" : "bg-[var(--text-muted)]",
        ].join(" ")}
      />
      <span className="flex-1 leading-snug">{item.message}</span>
      <button
        onClick={() => onDismiss(item.id)}
        aria-label="閉じる"
        className="text-[var(--text-subtle)] hover:text-[var(--text-primary)] transition-colors text-base leading-none ml-1"
      >
        ×
      </button>
    </div>
  );
}
