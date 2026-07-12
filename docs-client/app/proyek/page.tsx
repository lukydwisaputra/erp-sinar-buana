import { Screenshot } from "@/components/screenshot";
import { Callout } from "@/components/callout";

export default function ProyekPage() {
  return (
    <>
      <h1>Proyek</h1>
      <p className="lede">
        Melacak pekerjaan dari SPH yang sudah <em>Deal</em> sampai selesai, lengkap
        dengan milestone bertingkat, penugasan karyawan, dan realisasi RAB. Tampilannya
        adalah tabel dan pohon milestone biasa — bukan papan kerja/kanban.
      </p>

      <h2>Daftar Proyek</h2>
      <p>
        Kolom tabel: No. Proyek, Perusahaan, Layanan (bila lebih dari satu, sisanya
        muncul sebagai &quot;+N&quot; yang bisa dibuka), dan Status. Dialog Filter
        menyaring berdasarkan Status dan Layanan (bisa pilih lebih dari satu). Menu aksi
        pada setiap baris memuat pintasan <strong>Lihat SPH</strong> dan{" "}
        <strong>Lihat Faktur</strong> — nilai kontrak proyek tidak ditampilkan di halaman
        ini (lihat di Dasbor atau di halaman Perusahaan).
      </p>
      <Screenshot src="/screenshots/proyek-list.png" caption="Daftar Proyek." />

      <h2>Membuat proyek</h2>
      <p>
        Proyek hanya dibuat dari SPH yang sudah berstatus <em>Deal</em>, lewat pintasan{" "}
        <strong>Buat Proyek</strong> pada menu aksi baris SPH tersebut di halaman
        Penawaran — tidak ada tombol &quot;Buat Proyek&quot; langsung di halaman Proyek
        ini. Form pembuatan hanya meminta Nama, Area, Tahun, dan penanggung jawab; daftar
        layanan proyek diwarisi dari SPH asalnya.
      </p>
      <Screenshot src="/screenshots/proyek-create.png" caption="Form pembuatan proyek baru (dari SPH Deal)." />

      <h2>Detail proyek</h2>
      <p>
        Milestone tersusun bertingkat tiga: milestone utama, sub-milestone, dan
        checklist — masing-masing bisa diurut naik/turun, diberi penanggung jawab, dan
        diberi tanggal Target/Aktual. Klik sebuah milestone untuk membuka jendela penuh
        berisi detail (deskripsi, penanggung jawab, tanggal) di kiri dan{" "}
        <strong>diskusi/komentar</strong> (mendukung penyebutan @nama) di kanan —
        diskusi ini tidak terlihat oleh klien di portal.
      </p>
      <p>
        Milestone yang ditandai selesai dan berkaitan dengan termin faktur akan
        menampilkan saran &quot;Tagih Termin&quot; — ini hanya saran, faktur tidak
        dibuat otomatis. Realisasi RAB (biaya aktual dibandingkan anggaran) hanya
        terlihat oleh Admin dan Keuangan, dan menjadi dasar perhitungan profitabilitas
        proyek di Dasbor.
      </p>
      <Screenshot src="/screenshots/proyek-detail.png" caption="Detail proyek — milestone bertingkat dan realisasi RAB." />

      <Callout>
        Status pekerjaan proyek dan milestone bisa dikustomisasi oleh Admin lewat menu
        Konfigurasi → Workflow Status, tanpa perlu bantuan developer.
      </Callout>
    </>
  );
}
