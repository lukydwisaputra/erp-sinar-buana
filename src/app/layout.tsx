import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { fontSans, fontMono } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sinar Buana ERP",
  description: "Prototype ERP internal PT Sinar Buana Mandiri Jaya",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning className={`${fontSans.variable} ${fontMono.variable}`}>
      <body className="font-sans bg-background text-foreground antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
