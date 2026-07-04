import type { Metadata } from "next";
import { Sidebar } from "@/components/sidebar";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Panduan Aplikasi Sinar Buana ERP",
    template: "%s — Panduan Sinar Buana ERP",
  },
  description: "Panduan penggunaan aplikasi ERP Sinar Buana untuk klien, halaman demi halaman.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" dir="ltr">
      <body>
        <div className="layout">
          <Sidebar />
          <main className="content">
            <div className="content-inner">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
