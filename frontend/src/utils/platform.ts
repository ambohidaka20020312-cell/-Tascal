import { Capacitor } from '@capacitor/core';

/** Returns true when running on iOS (native or browser UA). */
export function isIOS(): boolean {
  if (Capacitor.isNativePlatform()) {
    return Capacitor.getPlatform() === 'ios';
  }
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

/** Returns true when running on Android (native or browser UA). */
export function isAndroid(): boolean {
  if (Capacitor.isNativePlatform()) {
    return Capacitor.getPlatform() === 'android';
  }
  return /Android/.test(navigator.userAgent);
}

/** Returns true when running in a standard browser (not inside Capacitor). */
export function isWeb(): boolean {
  return !Capacitor.isNativePlatform();
}

/** Returns true when running on iOS or Android. */
export function isMobile(): boolean {
  return isIOS() || isAndroid();
}

export interface SafeAreaInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

/**
 * Returns the safe-area insets for the current device.
 *
 * On native iOS/Android the values come from CSS environment variables exposed
 * by the WebView.  On web they default to 0.
 */
export async function safeAreaInsets(): Promise<SafeAreaInsets> {
  // Helper to read a CSS env() variable via a temporary element
  const readEnvPx = (varName: string): number => {
    const el = document.createElement('div');
    el.style.position = 'fixed';
    el.style.top = '0';
    el.style.left = '0';
    el.style.width = `env(${varName}, 0px)`;
    el.style.height = `env(${varName}, 0px)`;
    el.style.visibility = 'hidden';
    el.style.pointerEvents = 'none';
    document.body.appendChild(el);
    const computed = getComputedStyle(el);
    const width = parseFloat(computed.width) || 0;
    const height = parseFloat(computed.height) || 0;
    document.body.removeChild(el);
    // width / height will be non-zero for horizontal / vertical insets
    return Math.max(width, height);
  };

  return {
    top: readEnvPx('safe-area-inset-top'),
    bottom: readEnvPx('safe-area-inset-bottom'),
    left: readEnvPx('safe-area-inset-left'),
    right: readEnvPx('safe-area-inset-right'),
  };
}
