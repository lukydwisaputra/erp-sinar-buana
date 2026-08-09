import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "./providers";
import { fontSans, fontMono } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sinar Buana ERP",
  description: "ERP internal PT Sinar Buana Mandiri Jaya",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning className={`${fontSans.variable} ${fontMono.variable}`}>
      <body suppressHydrationWarning className="font-sans bg-background text-foreground antialiased">
        <Providers>
          {children}
          <Toaster richColors position="top-right" />
        </Providers>
      </body>
    </html>
  );
}
