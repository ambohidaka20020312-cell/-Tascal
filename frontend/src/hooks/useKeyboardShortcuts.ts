import { useEffect } from "react";

export function useKeyboardShortcuts() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      switch (e.key) {
        case "n":
        case "N":
          e.preventDefault();
          window.dispatchEvent(new CustomEvent("open-task-form"));
          break;
        case "?":
          e.preventDefault();
          window.dispatchEvent(new CustomEvent("toggle-shortcuts"));
          break;
        case "Escape":
          window.dispatchEvent(new CustomEvent("close-overlays"));
          break;
        case "f":
        case "F":
          e.preventDefault();
          window.dispatchEvent(new CustomEvent("focus-filter"));
          break;
        case "1":
          e.preventDefault();
          window.dispatchEvent(new CustomEvent("set-filter:all"));
          break;
        case "2":
          e.preventDefault();
          window.dispatchEvent(new CustomEvent("set-filter:todo"));
          break;
        case "3":
          e.preventDefault();
          window.dispatchEvent(new CustomEvent("set-filter:in_progress"));
          break;
        case "4":
          e.preventDefault();
          window.dispatchEvent(new CustomEvent("set-filter:done"));
          break;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
}
