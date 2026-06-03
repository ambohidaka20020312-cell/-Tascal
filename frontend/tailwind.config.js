export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Legacy primary colors mapped to monochrome
        primary: {
          50: "#f8f8f8",
          100: "#f0f0f0",
          500: "#111111",
          600: "#111111",
          700: "#333333",
        },
        // Monochrome palette
        surface: {
          0: "#ffffff",
          1: "#f8f8f8",
          2: "#f0f0f0",
          3: "#e4e4e4",
        },
        ink: {
          DEFAULT: "#111111",
          muted: "#555555",
          subtle: "#999999",
          faint: "#cccccc",
        },
        // Accent (black only)
        accent: {
          DEFAULT: "#111111",
          hover: "#333333",
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Hiragino Sans"', '"Hiragino Kaku Gothic ProN"', '"Noto Sans JP"', 'sans-serif'],
      },
      letterSpacing: {
        wide: '0.04em',
        wider: '0.08em',
      },
      borderRadius: {
        DEFAULT: '8px',
        lg: '12px',
        xl: '16px',
      },
      // iOS safe-area inset support
      padding: {
        "safe-top": "env(safe-area-inset-top)",
        "safe-bottom": "env(safe-area-inset-bottom)",
        "safe-left": "env(safe-area-inset-left)",
        "safe-right": "env(safe-area-inset-right)",
      },
      // Touch-target minimum sizes (WCAG 2.5.5)
      minHeight: {
        touch: "44px",
      },
      minWidth: {
        touch: "44px",
      },
    },
  },
  plugins: [],
};
