import { Screenshot } from "@/components/screenshot";
import { Callout } from "@/components/callout";

export default function DasborPage() {
  return (
    <>
      <h1>Dasbor</h1>
      <p className="lede">
        Halaman pertama yang muncul setelah masuk. Dasbor tidak menyimpan data sendiri —
        semua angka di sini dihitung otomatis dari modul lain (Arus Kas, Faktur, Proyek,
        Pajak) untuk periode yang dipilih lewat pemilih periode di bagian atas halaman.
      </p>
      <Screenshot src="/screenshots/dasbor.png" caption="Dasbor — KPI, profitabilitas, arus kas, dan perlu perhatian." />

      <h2>Untuk semua peran</h2>
      <ul>
        <li>
          <strong>Perlu Perhatian</strong> — daftar hal yang perlu ditindaklanjuti (mis.
          faktur jatuh tempo, pajak terlambat/mendekati tenggat, bukti potong belum
          diterima), masing-masing bisa diklik untuk masuk ke halaman terkait.
        </li>
        <li>
          <strong>Ringkasan Proyek</strong> — total proyek beserta rinciannya per
          Status, Area, dan Layanan.
        </li>
      </ul>

      <h2>Khusus Admin &amp; Keuangan</h2>
      <p>Peran lain (Sales, Tim Teknis, Viewer) tidak melihat bagian ini sama sekali.</p>
      <ul>
        <li>
          <strong>8 kartu KPI</strong> — Laba Bersih (Est.), Pendapatan, Kas Saat Ini,
          Runway, AR Terutang, Pajak Terutang, Laba Kotor, dan Laba Operasional.
        </li>
        <li>
          <strong>Laba Rugi (Aktual)</strong> — grafik waterfall, berbeda dari arus kas:
          arus kas mengukur pergerakan uang, Laba-Rugi mengukur keuntungan berbasis
          akrual.
        </li>
        <li><strong>Profitabilitas per proyek</strong> — tabel perbandingan antar proyek.</li>
        <li>
          <strong>Ringkasan Keuangan Bulanan</strong> — Total Pemasukan, Total
          Pengeluaran, Saldo Akhir.
        </li>
        <li>
          <strong>Grafik kategori arus kas</strong> (pie) dan <strong>tren bulanan</strong>{" "}
          (garis) — klik sebuah kategori pada grafik pie untuk lompat ke Arus Kas dengan
          filter kategori tersebut sudah terpasang.
        </li>
        <li><strong>Ringkasan Pajak</strong> dan tabel riwayat transaksi arus kas periode terpilih.</li>
      </ul>

      <Callout>
        Tampilan dasbor menyesuaikan peran pengguna yang sedang masuk — Sales, Tim
        Teknis, dan Viewer hanya melihat Perlu Perhatian dan Ringkasan Proyek; seluruh
        panel keuangan hanya untuk Admin dan Keuangan.
      </Callout>
    </>
  );
}
