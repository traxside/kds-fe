import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "var(--clr-primary-a0)",
          light: "var(--clr-primary-a20)",
          lighter: "var(--clr-primary-a40)",
        },
        surface: {
          DEFAULT: "var(--clr-surface-a0)",
          10: "var(--clr-surface-a10)",
          20: "var(--clr-surface-a20)",
          30: "var(--clr-surface-a30)",
          40: "var(--clr-surface-a40)",
          50: "var(--clr-surface-a50)",
        },
        "surface-tonal": {
          DEFAULT: "var(--clr-surface-tonal-a0)",
          10: "var(--clr-surface-tonal-a10)",
          20: "var(--clr-surface-tonal-a20)",
          30: "var(--clr-surface-tonal-a30)",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config; 