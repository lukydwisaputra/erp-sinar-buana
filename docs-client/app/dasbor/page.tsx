import { Screenshot } from "@/components/screenshot";
import { Callout } from "@/components/callout";

export default function DasborPage() {
  return (
    <>
      <h1>Dasbor</h1>
      <p className="lede">
        Halaman pertama yang muncul setelah masuk. Dasbor tidak menyimpan data sendiri —
        semua angka di sini dihitung otomatis (real-time) dari modul lain: Arus Kas,
        Faktur, Proyek, dan Pajak.
      </p>
      <Screenshot src="/screenshots/dasbor.png" caption="Dasbor — ringkasan arus kas, profitabilitas, dan pusat perhatian." />

      <h2>Yang ditampilkan</h2>
      <ul>
        <li><strong>Ringkasan arus kas</strong> — kas masuk dan keluar bulan berjalan.</li>
        <li>
          <strong>Profitabilitas (Laba-Rugi)</strong> — berbeda dari arus kas: arus kas
          mengukur pergerakan uang, Laba-Rugi mengukur keuntungan berbasis akrual.
          Keduanya sengaja ditampilkan terpisah.
        </li>
        <li><strong>Proyeksi arus kas</strong> — perkiraan posisi kas ke depan.</li>
        <li>
          <strong>Pusat Perhatian</strong> — daftar hal yang perlu ditindaklanjuti, mis.
          faktur jatuh tempo atau kewajiban pajak mendekati tenggat.
        </li>
      </ul>

      <Callout>
        Tampilan dasbor menyesuaikan peran pengguna yang sedang masuk — setiap orang
        hanya melihat ringkasan yang relevan dengan pekerjaannya.
      </Callout>
    </>
  );
}
