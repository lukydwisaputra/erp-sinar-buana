import Link from "next/link";
import { DOC_GROUPS } from "@/lib/modules";

export default function HomePage() {
  return (
    <>
      <h1>Panduan Aplikasi Sinar Buana ERP</h1>
      <p className="lede">
        Panduan ini menjelaskan cara menggunakan aplikasi ERP Sinar Buana, halaman demi
        halaman, lengkap dengan tangkapan layar. Pilih modul di sisi kiri, atau mulai dari
        &ldquo;Masuk &amp; Undangan Akun&rdquo; jika ini pertama kalinya Anda menggunakan
        aplikasi.
      </p>

      {DOC_GROUPS.map((group) => (
        <section key={group.label}>
          <h2>{group.label}</h2>
          <div className="module-grid">
            {group.modules.map((m) => (
              <Link key={m.slug} href={`/${m.slug}`} className="module-card">
                <div className="group">{group.label}</div>
                <div className="label">{m.label}</div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
