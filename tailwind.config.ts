import type { Config } from "tailwindcss";

/**
 * Sistema de diseño HabitIA inspirado en interfaces Apple.
 * Canvas cálido, tipografía sans muy legible, verde botánico como acento,
 * superficies translúcidas y profundidad contenida.
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
          DEFAULT: "#F7F8F5",
          50: "#FFFFFF",
          100: "#FAFBF8",
          200: "#F1F4EF",
          300: "#E8ECE6",
        },
        // Texto y tinta.
        ink: {
          DEFAULT: "#17211D",
          900: "#101713",
          800: "#1B2822",
          700: "#34443D",
        },
        stone: {
          DEFAULT: "#68736D",
          400: "#8B9690",
          500: "#68736D",
          600: "#4C5A53",
        },
        mist: "#98A39D",
        // Hairlines y reglas.
        hairline: {
          DEFAULT: "#E3E8E3",
          strong: "#CFD7D1",
        },
        // Acento HabitIA: verde botánico calmado, legible y no estridente.
        saffron: {
          50: "#ECF8F1",
          100: "#D8F0E2",
          200: "#B4DFC7",
          300: "#83C8A4",
          500: "#2D7C59",
          700: "#176547",
        },
        // Colores secundarios reservados para estados semánticos.
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
        // Cargadas localmente con Geist en app/layout.tsx → CSS variables.
        display: ["var(--font-sans)", "Geist", "SF Pro Display", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "Geist", "SF Pro Text", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "Geist Mono", "SF Mono", "monospace"],
      },
      fontSize: {
        "display-xl": ["clamp(3rem, 7vw, 5.5rem)", { lineHeight: "1.02", letterSpacing: "-0.035em" }],
        "display-lg": ["clamp(2.25rem, 5vw, 3.75rem)", { lineHeight: "1.05", letterSpacing: "-0.03em" }],
        "display-md": ["clamp(1.75rem, 3vw, 2.5rem)", { lineHeight: "1.1", letterSpacing: "-0.02em" }],
      },
      borderRadius: {
        sm: "6px",
        DEFAULT: "8px",
        lg: "12px",
        xl: "16px",
        "2xl": "24px",
      },
      boxShadow: {
        // Ultra difusas, opacidad < 0.05.
        hairline: "0 0 0 1px rgba(0, 0, 0, 0.04)",
        lift: "0 1px 2px rgba(16, 23, 19, 0.04), 0 18px 44px -20px rgba(16, 23, 19, 0.18)",
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
