import { Screenshot } from "@/components/screenshot";
import { Callout } from "@/components/callout";

export default function KonfigurasiPage() {
  return (
    <>
      <h1>Konfigurasi</h1>
      <p className="lede">
        Pusat pengaturan aplikasi — tempat Admin mengelola sendiri daftar pilihan,
        alur status, template dokumen, dan tarif, tanpa perlu bantuan developer.
      </p>
      <Screenshot src="/screenshots/konfigurasi.png" caption="Halaman Konfigurasi (tampilan tab)." />

      <h2>Yang bisa diatur</h2>
      <ul>
        <li>
          <strong>Daftar Pilihan</strong> — Jenis Layanan, Jenis Dokumen, Kewenangan,
          Dasar Hukum, Area Administrasi, Jabatan, Status Kepegawaian, Komponen Gaji,
          Rekening Bank.
        </li>
        <li>
          <strong>Workflow Status</strong> — alur status untuk Proyek, Penawaran, Faktur,
          dan Penggajian.
        </li>
        <li><strong>Kategori Arus Kas</strong> — kategori pemasukan/pengeluaran.</li>
        <li><strong>Template Dokumen</strong> — template PDF dan milestone proyek.</li>
        <li><strong>Tarif &amp; Penomoran</strong> — tarif PPN/PPh dan format nomor dokumen.</li>
        <li><strong>Pengiriman</strong> — pengaturan akun pengiriman dokumen.</li>
      </ul>

      <Callout>
        Menu ini hanya dapat diakses oleh Admin.
      </Callout>
    </>
  );
}
