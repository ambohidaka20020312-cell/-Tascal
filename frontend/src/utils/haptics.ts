export const haptics = {
  light: () => {
    if ("vibrate" in navigator) navigator.vibrate(10);
  },
  success: () => {
    if ("vibrate" in navigator) navigator.vibrate([10, 50, 10]);
  },
  error: () => {
    if ("vibrate" in navigator) navigator.vibrate([50, 100, 50]);
  },
};
