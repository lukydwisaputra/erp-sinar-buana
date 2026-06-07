/**
 * Sinar Buana ERP — typography setup (next/font)
 *
 * Open-source equivalents of the Supabase typefaces:
 *   - Inter            → UI, body, headings (closest free match to Supabase docs)
 *   - Source Code Pro  → code, IDs, and money/tabular figures
 *
 * Both are self-hosted by next/font (no network request at runtime, no layout shift)
 * and exposed as CSS variables that globals.css reads (--font-sans / --font-mono).
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
