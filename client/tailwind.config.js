/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // base canvas + panels (deep FR4 charcoal)
        canvas: "rgb(var(--canvas) / <alpha-value>)",
        "canvas-2": "rgb(var(--canvas-2) / <alpha-value>)",
        surface: {
          DEFAULT: "rgb(var(--surface) / <alpha-value>)",
          2: "rgb(var(--surface-2) / <alpha-value>)",
          3: "rgb(var(--surface-3) / <alpha-value>)",
        },
        line: {
          DEFAULT: "rgb(var(--line) / <alpha-value>)",
          strong: "rgb(var(--line-strong) / <alpha-value>)",
        },
        ink: {
          DEFAULT: "rgb(var(--ink) / <alpha-value>)",
          dim: "rgb(var(--ink-dim) / <alpha-value>)",
          faint: "rgb(var(--ink-faint) / <alpha-value>)",
        },
        // signature accents
        copper: {
          DEFAULT: "rgb(var(--copper) / <alpha-value>)",
          bright: "rgb(var(--copper-bright) / <alpha-value>)",
          dim: "rgb(var(--copper-dim) / <alpha-value>)",
        },
        signal: {
          DEFAULT: "rgb(var(--signal) / <alpha-value>)",
          bright: "rgb(var(--signal-bright) / <alpha-value>)",
        },
        // semantic / status
        ok: "rgb(var(--ok) / <alpha-value>)",
        warn: "rgb(var(--warn) / <alpha-value>)",
        bad: "rgb(var(--bad) / <alpha-value>)",
        info: "rgb(var(--info) / <alpha-value>)",
        qc: "rgb(var(--qc) / <alpha-value>)",
      },
      fontFamily: {
        display: ['"Archivo Variable"', "system-ui", "sans-serif"],
        sans: ['"Hanken Grotesk Variable"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono Variable"', "ui-monospace", "monospace"],
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem", letterSpacing: "0.04em" }],
      },
      borderRadius: {
        xl: "0.75rem",
        "2xl": "1rem",
      },
      boxShadow: {
        panel: "0 1px 0 0 rgb(255 255 255 / 0.03) inset, 0 12px 40px -16px rgb(0 0 0 / 0.7)",
        glow: "0 0 0 1px rgb(var(--copper) / 0.4), 0 0 24px -4px rgb(var(--copper) / 0.45)",
        "glow-signal": "0 0 0 1px rgb(var(--signal) / 0.4), 0 0 22px -6px rgb(var(--signal) / 0.5)",
        led: "0 0 8px 0 currentColor",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-led": {
          "0%, 100%": { opacity: "1", boxShadow: "0 0 8px 0 currentColor" },
          "50%": { opacity: "0.45", boxShadow: "0 0 2px 0 currentColor" },
        },
        sweep: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        "spin-slow": {
          to: { transform: "rotate(360deg)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) both",
        "pulse-led": "pulse-led 1.8s ease-in-out infinite",
        sweep: "sweep 1.6s ease-in-out infinite",
        "spin-slow": "spin-slow 1.1s linear infinite",
      },
      transitionTimingFunction: {
        snap: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [],
};
