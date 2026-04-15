import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        goto: {
          green: "#00AA13",
          dark: "#008C10",
          light: "#E6F9E8",
          50: "#F0FFF1",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          secondary: "#F7F7F8",
          tertiary: "#F0F1F3",
          dark: "#1C1C1E",
        },
        txt: {
          primary: "#1C1C1E",
          secondary: "#6B7280",
          muted: "#9CA3AF",
          inverse: "#FFFFFF",
        },
        border: {
          DEFAULT: "#E5E7EB",
          light: "#F3F4F6",
        },
      },
      fontFamily: {
        sans: ["var(--font-source-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-lora)", "Georgia", "serif"],
      },
      borderRadius: {
        DEFAULT: "12px",
        sm: "8px",
        xs: "6px",
        full: "9999px",
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
        "card-hover": "0 10px 25px rgba(0,0,0,0.08), 0 4px 10px rgba(0,0,0,0.04)",
        nav: "0 1px 3px rgba(0,0,0,0.05)",
      },
      animation: {
        "fade-in": "fadeIn 0.4s ease-out",
        "fade-up": "fadeUp 0.5s ease-out",
        "scroll-x": "scrollX 35s linear infinite",
        marquee: "marquee 60s linear infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scrollX: {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(-100%)" },
        },
        marquee: {
          "0%": { transform: "translateX(0%)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
