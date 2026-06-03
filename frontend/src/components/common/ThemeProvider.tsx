import { useEffect } from "react";
import { useSettingsStore } from "../../store/settingsStore";

const ACCENT_HEX: Record<string, string> = {
  blue: "#3b82f6",
  purple: "#8b5cf6",
  green: "#22c55e",
  orange: "#f97316",
  red: "#ef4444",
  pink: "#ec4899",
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSettingsStore((s) => s.theme);
  const accentColor = useSettingsStore((s) => s.accentColor);

  useEffect(() => {
    const root = document.documentElement;
    const applyDark =
      theme === "dark" ||
      (theme === "system" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);

    if (applyDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    root.style.setProperty("--accent-color", ACCENT_HEX[accentColor] ?? ACCENT_HEX.blue);
  }, [theme, accentColor]);

  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      if (e.matches) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  return <>{children}</>;
}
