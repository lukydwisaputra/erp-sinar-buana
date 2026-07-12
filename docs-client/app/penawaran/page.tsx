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
        Semua SPH ditampilkan dalam satu tabel dengan pencarian dan Dialog Filter
        (Status, rentang tanggal). Nomor SPH dibuat otomatis dengan format seperti{" "}
        <code>SPH/001/5.2026</code> — format ini bisa disesuaikan Admin lewat
        Konfigurasi → Tarif &amp; Penomoran.
      </p>
      <Screenshot src="/screenshots/penawaran-list.png" caption="Daftar Penawaran." />

      <h2>Membuat SPH baru</h2>
      <p>
        Klik <strong>Buat SPH</strong> untuk membuka penyusun penawaran: pilih perusahaan
        dan PIC tujuan, tambahkan baris layanan beserta harga dan volume, susun RAB dan
        jadwal, pilih <strong>Kelengkapan</strong> administrasi yang disyaratkan, atur{" "}
        <strong>Skema Termin</strong> pembayaran, aktifkan PPN/PPh 23 bila perlu, isi
        Catatan &amp; Masa Berlaku penawaran — pratinjau dokumen diperbarui otomatis di
        sisi kanan sebelum dikirim.
      </p>
      <Screenshot src="/screenshots/penawaran-builder.png" caption="Penyusun SPH — form di kiri, pratinjau dokumen di kanan." />

      <h2>Detail &amp; status SPH</h2>
      <p>
        Klik salah satu SPH pada daftar untuk membukanya — bila statusnya masih Draf atau
        Terkirim, yang terbuka adalah penyusun yang sama seperti saat membuat SPH
        (langsung bisa diedit). Begitu berstatus <em>Deal</em>, Ditolak, atau Dibatalkan,
        tampilannya berubah menjadi dokumen terkunci (baca-saja) dengan tombol{" "}
        <strong>Unduh</strong>/<strong>Kirim</strong>. Alur status yang benar-benar bisa
        dijalankan dari UI: <strong>Draf → Terkirim</strong>, lalu{" "}
        <strong>Terkirim → Disetujui (Deal)</strong> atau{" "}
        <strong>Terkirim → Ditolak</strong>.
      </p>
      <Screenshot src="/screenshots/penawaran-detail.png" caption="Contoh dokumen SPH yang sudah tersimpan." />

      <Callout>
        SPH yang sudah <strong>Disetujui (Deal)</strong>, <strong>Ditolak</strong>, atau{" "}
        <strong>Dibatalkan</strong> tidak dapat diubah lagi. Menjadikan SPH sebagai Deal
        hanya mengubah statusnya — proyek <strong>tidak</strong> otomatis dibuat;
        gunakan pintasan &quot;Buat Proyek&quot; pada menu aksi baris SPH tersebut untuk
        membuatnya secara sengaja.
      </Callout>
    </>
  );
}
