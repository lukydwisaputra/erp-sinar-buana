import { Screenshot } from "@/components/screenshot";
import { Callout } from "@/components/callout";

export default function PenawaranPage() {
  return (
    <>
      <h1>Penawaran (SPH)</h1>
      <p className="lede">
        Surat Penawaran Harga (SPH) adalah titik awal alur penjualan. Setiap SPH terhubung
        ke Perusahaan (klien) dan satu atau lebih layanan dari Katalog Layanan.
      </p>

      <h2>Daftar Penawaran</h2>
      <p>
        Semua SPH ditampilkan dalam satu tabel dengan pencarian, filter, dan urutan
        kolom. Nomor SPH dibuat otomatis dengan format <code>SPH/001/5.2026</code>.
      </p>
      <Screenshot src="/screenshots/penawaran-list.png" caption="Daftar Penawaran." />

      <h2>Membuat SPH baru</h2>
      <p>
        Klik <strong>Buat SPH</strong> untuk membuka penyusun penawaran: pilih perusahaan
        dan PIC tujuan, tambahkan baris layanan beserta harga dan volume, atur RAB dan
        jadwal jika diperlukan, lalu pratinjau dokumen langsung diperbarui otomatis di
        sisi kanan sebelum dikirim.
      </p>
      <Screenshot src="/screenshots/penawaran-builder.png" caption="Penyusun SPH — form di kiri, pratinjau dokumen di kanan." />

      <h2>Detail &amp; status SPH</h2>
      <p>
        Klik salah satu SPH pada daftar untuk membuka detailnya. Status berjalan mengikuti
        alur kerja: <strong>Draf → Terkirim → Disetujui (Deal)</strong>, atau
        <strong> Ditolak/Dibatalkan</strong>. SPH yang menjadi <em>Deal</em> otomatis
        menjadi dasar pembuatan Proyek.
      </p>
      <Screenshot src="/screenshots/penawaran-detail.png" caption="Contoh dokumen SPH yang sudah tersimpan." />

      <Callout>
        SPH yang sudah <strong>Disetujui (Deal)</strong> tidak dapat diubah lagi — ini
        menjaga riwayat penawaran tetap konsisten dengan proyek yang berjalan.
      </Callout>
    </>
  );
}
