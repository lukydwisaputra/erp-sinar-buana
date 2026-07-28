// Sinar Buana ERP — Tailwind theme extension (drop-in)
//
// Maps the CSS custom properties from ./globals.css onto Tailwind's color/utility
// system so classes like `bg-background`, `text-muted-foreground`, `bg-success`,
// and `font-mono` resolve to the design tokens. shadcn/ui consumes this shape
// directly — `npx shadcn init` will produce a near-identical block.
//
// NOTE: tokens store the *full* OKLCH colour (Tailwind v4 / current shadcn), so
// we reference them with `var(--token)` — NOT `hsl(var(--token))`. Wrapping an
// oklch() value in hsl() would silently break every colour.
//
// On Tailwind v4 you can skip this file entirely and map tokens with `@theme`:
//   @theme inline { --color-background: var(--background); --color-primary: var(--primary); … }
//
// Tailwind v3 wiring (when apps/web exists):
//   // tailwind.config.ts
//   import { erpTheme } from "../docs/design/tokens/tailwind-theme"; // or copy inline
//   export default {
//     darkMode: "class",
//     content: ["./src/**/*.{ts,tsx}"],
//     theme: { extend: erpTheme },
//     plugins: [require("tailwindcss-animate")],
//   };
import type { Config } from "tailwindcss";

export const erpTheme: NonNullable<Config["theme"]>["extend"] = {
  colors: {
    border: "var(--border)",
    input: "var(--input)",
    ring: "var(--ring)",
    background: "var(--background)",
    foreground: "var(--foreground)",
    primary: {
      DEFAULT: "var(--primary)",
      foreground: "var(--primary-foreground)",
    },
    secondary: {
      DEFAULT: "var(--secondary)",
      foreground: "var(--secondary-foreground)",
    },
    destructive: {
      DEFAULT: "var(--destructive)",
      foreground: "var(--destructive-foreground)",
    },
    success: {
      DEFAULT: "var(--success)",
      foreground: "var(--success-foreground)",
    },
    warning: {
      DEFAULT: "var(--warning)",
      foreground: "var(--warning-foreground)",
    },
    info: {
      DEFAULT: "var(--info)",
      foreground: "var(--info-foreground)",
    },
    muted: {
      DEFAULT: "var(--muted)",
      foreground: "var(--muted-foreground)",
    },
    accent: {
      DEFAULT: "var(--accent)",
      foreground: "var(--accent-foreground)",
    },
    popover: {
      DEFAULT: "var(--popover)",
      foreground: "var(--popover-foreground)",
    },
    card: {
      DEFAULT: "var(--card)",
      foreground: "var(--card-foreground)",
    },
    sidebar: {
      DEFAULT: "var(--sidebar)",
      foreground: "var(--sidebar-foreground)",
      primary: "var(--sidebar-primary)",
      "primary-foreground": "var(--sidebar-primary-foreground)",
      accent: "var(--sidebar-accent)",
      "accent-foreground": "var(--sidebar-accent-foreground)",
      border: "var(--sidebar-border)",
      ring: "var(--sidebar-ring)",
    },
    chart: {
      1: "var(--chart-1)",
      2: "var(--chart-2)",
      3: "var(--chart-3)",
      4: "var(--chart-4)",
      5: "var(--chart-5)",
    },
  },
  borderRadius: {
    lg: "var(--radius)",
    md: "calc(var(--radius) - 2px)",
    sm: "calc(var(--radius) - 4px)",
  },
  fontFamily: {
    // var names produced by tokens/fonts.ts
    sans: ["var(--font-sans)", "system-ui", "sans-serif"],
    mono: ["var(--font-mono)", "ui-monospace", "monospace"],
  },
  keyframes: {
    "accordion-down": {
      from: { height: "0" },
      to: { height: "var(--radix-accordion-content-height)" },
    },
    "accordion-up": {
      from: { height: "var(--radix-accordion-content-height)" },
      to: { height: "0" },
    },
  },
  animation: {
    "accordion-down": "accordion-down 0.2s ease-out",
    "accordion-up": "accordion-up 0.2s ease-out",
  },
};

export default erpTheme;
