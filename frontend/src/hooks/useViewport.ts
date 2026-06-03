import { useState, useEffect } from "react";

export type DeviceType =
  | "phone-small"
  | "phone"
  | "phone-large"
  | "tablet"
  | "desktop"
  | "ultrawide";

export interface SafeArea {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface ViewportInfo {
  width: number;
  height: number;
  aspectRatio: number;
  deviceType: DeviceType;
  isLandscape: boolean;
  safeArea: SafeArea;
  hasDynamicIsland: boolean;
}

function getDeviceType(width: number): DeviceType {
  if (width < 375) return "phone-small";
  if (width < 428) return "phone";
  if (width < 768) return "phone-large";
  if (width < 1024) return "tablet";
  if (width < 1920) return "desktop";
  return "ultrawide";
}

function parsePx(val: string): number {
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
}

function getSafeArea(): SafeArea {
  const style = getComputedStyle(document.documentElement);
  return {
    top: parsePx(style.getPropertyValue("--sat") || "0"),
    bottom: parsePx(style.getPropertyValue("--sab") || "0"),
    left: parsePx(style.getPropertyValue("--sal") || "0"),
    right: parsePx(style.getPropertyValue("--sar") || "0"),
  };
}

/**
 * Approximate Dynamic Island detection.
 * iPhone 14 Pro / 15 Pro / 16 series have a screen width of 393px+ at logical resolution
 * and a height/width ratio >= 2.15 in portrait.
 * We also check for the CSS env() safe-area-inset-top >= 59px which is the tell-tale sign.
 */
function detectDynamicIsland(width: number, height: number): boolean {
  // Landscape: skip
  if (width > height) return false;
  // Must be at least iPhone 14 Pro width (393 logical px)
  if (width < 393) return false;
  // Aspect ratio characteristic of Dynamic Island devices
  const ratio = height / width;
  if (ratio < 2.1) return false;
  // Try to read safe-area-inset-top via a temporary element
  try {
    const el = document.createElement("div");
    el.style.paddingTop = "env(safe-area-inset-top)";
    el.style.position = "fixed";
    el.style.visibility = "hidden";
    document.body.appendChild(el);
    const pt = parseFloat(getComputedStyle(el).paddingTop);
    document.body.removeChild(el);
    // Dynamic Island devices report safe-area-inset-top >= 59px
    return pt >= 59;
  } catch {
    return false;
  }
}

function buildViewport(): ViewportInfo {
  const width = window.innerWidth;
  const height = window.innerHeight;
  return {
    width,
    height,
    aspectRatio: width / height,
    deviceType: getDeviceType(width),
    isLandscape: width > height,
    safeArea: getSafeArea(),
    hasDynamicIsland: detectDynamicIsland(width, height),
  };
}

export function useViewport(): ViewportInfo {
  const [viewport, setViewport] = useState<ViewportInfo>(() => buildViewport());

  useEffect(() => {
    // Inject CSS custom properties for safe area so getSafeArea() can read them
    const styleId = "viewport-safe-area-props";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = `
        :root {
          --sat: env(safe-area-inset-top, 0px);
          --sab: env(safe-area-inset-bottom, 0px);
          --sal: env(safe-area-inset-left, 0px);
          --sar: env(safe-area-inset-right, 0px);
        }
      `;
      document.head.appendChild(style);
    }

    const handler = () => setViewport(buildViewport());
    window.addEventListener("resize", handler, { passive: true });
    window.addEventListener("orientationchange", handler, { passive: true });
    return () => {
      window.removeEventListener("resize", handler);
      window.removeEventListener("orientationchange", handler);
    };
  }, []);

  return viewport;
}
