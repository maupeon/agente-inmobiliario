import type { Config } from "tailwindcss";

/**
 * Sistema de diseño "minimalist-ui editorial".
 * Canvas warm bone, tipografía editorial serif + sans geométrica + mono,
 * un único acento pastel muted (saffron) y un secundario (clay/sage).
 * Sin shadows pesadas, bordes hairline, radios crujientes.
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Canvas y superficies. "Paper" es el fondo cálido del documento.
        paper: {
          DEFAULT: "#FBFAF6",
          50: "#FFFFFF",
          100: "#FDFCF8",
          200: "#F7F6F3",
          300: "#F1EFE9",
        },
        // Texto y tinta.
        ink: {
          DEFAULT: "#1A1A1A",
          900: "#111111",
          800: "#1F1F1F",
          700: "#2F3437",
        },
        stone: {
          DEFAULT: "#6B6862",
          400: "#8B8780",
          500: "#6B6862",
          600: "#4A4844",
        },
        mist: "#A8A49B",
        // Hairlines y reglas.
        hairline: {
          DEFAULT: "#EAE7DF",
          strong: "#D9D5CB",
        },
        // Único acento principal: saffron pastel muted.
        saffron: {
          50: "#FBF3DB",
          100: "#F8E9B6",
          200: "#EFD78A",
          300: "#D8B254",
          500: "#956400",
          700: "#7A5610",
        },
        // Secundario para tags semánticos: clay (terracota muteada).
        clay: {
          50: "#F4E5D9",
          100: "#EBD3C0",
          500: "#8B4A2B",
        },
        sage: {
          50: "#EDF3EC",
          500: "#346538",
        },
        rose: {
          50: "#FDEBEC",
          500: "#9F2F2D",
        },
      },
      fontFamily: {
        // Cargadas con next/font en app/layout.tsx → CSS variables.
        display: ["var(--font-display)", "Newsreader", "Lyon Text", "serif"],
        sans: ["var(--font-sans)", "Geist", "SF Pro Display", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "Geist Mono", "SF Mono", "monospace"],
      },
      fontSize: {
        "display-xl": ["clamp(3rem, 7vw, 5.5rem)", { lineHeight: "1.02", letterSpacing: "-0.035em" }],
        "display-lg": ["clamp(2.25rem, 5vw, 3.75rem)", { lineHeight: "1.05", letterSpacing: "-0.03em" }],
        "display-md": ["clamp(1.75rem, 3vw, 2.5rem)", { lineHeight: "1.1", letterSpacing: "-0.02em" }],
      },
      borderRadius: {
        sm: "4px",
        DEFAULT: "6px",
        lg: "8px",
        xl: "12px",
        "2xl": "16px",
      },
      boxShadow: {
        // Ultra difusas, opacidad < 0.05.
        hairline: "0 0 0 1px rgba(0, 0, 0, 0.04)",
        lift: "0 1px 1px rgba(17, 17, 17, 0.02), 0 8px 24px -12px rgba(17, 17, 17, 0.06)",
        nudge: "0 1px 0 rgba(17, 17, 17, 0.03)",
      },
      animation: {
        "fade-up": "fadeUp 600ms cubic-bezier(0.16, 1, 0.3, 1) both",
        "fade-in": "fadeIn 400ms ease-out both",
        "drift": "drift 28s ease-in-out infinite",
        "pulse-soft": "pulseSoft 2.4s ease-in-out infinite",
        "shimmer": "shimmer 1.6s linear infinite",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translate3d(0, 12px, 0)" },
          "100%": { opacity: "1", transform: "translate3d(0, 0, 0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        drift: {
          "0%, 100%": { transform: "translate3d(0, 0, 0) scale(1)" },
          "50%": { transform: "translate3d(2%, -1%, 0) scale(1.05)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "0.45" },
          "50%": { opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      transitionTimingFunction: {
        editorial: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
