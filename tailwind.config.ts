import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "var(--font-plus-jakarta)",
          "Plus Jakarta Sans",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      colors: {
        // Kinetic Dispatch design system
        canvas: "var(--kd-canvas)",
        surface: "var(--kd-surface)",
        "surface-dim": "var(--kd-surface-dim)",
        "surface-container": "var(--kd-surface-container)",
        "surface-container-low": "var(--kd-surface-container-low)",
        "surface-container-high": "var(--kd-surface-container-high)",
        outline: "var(--kd-outline)",
        "outline-variant": "var(--kd-outline-variant)",
        ink: "var(--kd-ink)",
        "ink-muted": "var(--kd-ink-muted)",
        brand: {
          DEFAULT: "var(--kd-brand)",
          dark: "var(--kd-brand-dark)",
          light: "var(--kd-brand-light)",
        },
        transit: {
          DEFAULT: "var(--kd-transit)",
          bg: "var(--kd-transit-bg)",
          text: "var(--kd-transit-text)",
        },
        delivered: {
          DEFAULT: "var(--kd-delivered)",
          bg: "var(--kd-delivered-bg)",
          text: "var(--kd-delivered-text)",
        },
        pending: {
          DEFAULT: "var(--kd-pending)",
          bg: "var(--kd-pending-bg)",
          text: "var(--kd-pending-text)",
        },
        critical: {
          DEFAULT: "var(--kd-critical)",
          bg: "var(--kd-critical-bg)",
          text: "var(--kd-critical-text)",
        },
      },
      borderRadius: {
        card: "1rem",
        control: "0.75rem",
        sheet: "1.5rem",
      },
      boxShadow: {
        "card-1": "0 1px 3px 0 rgba(15,23,42,0.04), 0 1px 2px -1px rgba(15,23,42,0.02)",
        "card-2": "0 10px 25px -5px rgba(15,23,42,0.08), 0 8px 10px -6px rgba(15,23,42,0.04)",
        sheet: "0 -10px 30px rgba(15,23,42,0.12)",
        glow: "0 4px 14px 0 rgba(59,130,246,0.25)",
      },
      minHeight: {
        touch: "3rem",
      },
      minWidth: {
        touch: "3rem",
      },
      keyframes: {
        pulseRing: {
          "0%": { transform: "scale(0.9)", opacity: "0.7" },
          "70%": { transform: "scale(1.8)", opacity: "0" },
          "100%": { transform: "scale(1.8)", opacity: "0" },
        },
      },
      animation: {
        "pulse-ring": "pulseRing 1.8s cubic-bezier(0.2,0.6,0.4,1) infinite",
      },
    },
  },
  plugins: [],
};
export default config;
