/**
 * Sinar Buana ERP — typography setup (drop-in, next/font)
 *
 * Open-source equivalents of the Supabase typefaces:
 *   - Inter            → UI, body, headings (closest free match to Supabase docs)
 *   - Source Code Pro  → code, IDs, and money/tabular figures (matches Office/Source Code Pro)
 *
 * Both are self-hosted by next/font (no network request at runtime, no layout shift)
 * and exposed as CSS variables that tailwind-theme.ts reads (--font-sans / --font-mono).
 *
 * Wiring (when apps/web exists):
 *   // src/app/layout.tsx
 *   import { fontSans, fontMono } from "../../docs/design/tokens/fonts"; // or copy inline
 *   export default function RootLayout({ children }) {
 *     return (
 *       <html lang="id" suppressHydrationWarning className={`${fontSans.variable} ${fontMono.variable}`}>
 *         <body className="font-sans antialiased">{children}</body>
 *       </html>
 *     );
 *   }
 *
 * Note: lang="id" — the ERP UI is Bahasa Indonesia (PRD NFR Bab 13). Inter covers the
 * Latin-Extended glyphs Indonesian needs.
 */
import { Inter, Source_Code_Pro } from "next/font/google";

export const fontSans = Inter({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-sans",
});

export const fontMono = Source_Code_Pro({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
  weight: ["400", "500", "600"],
});

/**
 * Optional geometric display alternative to echo Supabase's Circular on large hero
 * headings only. If adopted, expose as --font-display and add to tailwind fontFamily.
 *
 *   import { Outfit } from "next/font/google";
 *   export const fontDisplay = Outfit({ subsets: ["latin"], variable: "--font-display" });
 */
