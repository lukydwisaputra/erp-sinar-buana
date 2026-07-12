import { Screenshot } from "@/components/screenshot";
import { Callout } from "@/components/callout";

export default function KonfigurasiPage() {
  return (
    <>
      <h1>Konfigurasi</h1>
      <p className="lede">
        Pusat pengaturan aplikasi — tempat Admin mengelola sendiri daftar pilihan, alur
        status, template dokumen, dan tarif, tanpa perlu bantuan developer. Ada 7 tab.
      </p>
      <Screenshot src="/screenshots/konfigurasi.png" caption="Halaman Konfigurasi (tampilan tab)." />

      <h2>Daftar Pilihan</h2>
      <p>
        8 kategori master data yang dipakai sebagai daftar pilihan (bukan teks bebas) di
        seluruh aplikasi: Jenis Dokumen, Kewenangan, Dasar Hukum, Area/Kawasan Industri,
        Jabatan, Status Kepegawaian, Komponen Gaji, dan Rekening Bank.
      </p>

      <h2>Workflow Status</h2>
      <p>Alur status yang bisa disesuaikan untuk 4 entitas: Proyek, Milestone, Faktur, dan Penggajian.</p>

      <h2>Kategori Arus Kas</h2>
      <p>Kategori pemasukan/pengeluaran yang dipakai di modul Arus Kas.</p>

      <h2>Tarif &amp; Penomoran</h2>
      <p>Tarif PPN/PPh dan format nomor dokumen (SPH, Faktur, dsb).</p>

      <h2>Template</h2>
      <p>Tiga sub-tab: Template Milestone, Template Termin, dan Template PDF.</p>

      <h2>Pengiriman</h2>
      <p>
        Mengatur akun SMTP tunggal untuk mengirim dokumen (Host, Port, Username,
        Password, Nama Pengirim, Email Pengirim). Tombol <strong>Simpan</strong> hanya
        aktif setelah <strong>Uji Koneksi</strong> berhasil — sandi yang sudah tersimpan
        tidak pernah ditampilkan kembali oleh server setelah disimpan. Di bawahnya
        terdapat editor template pesan <strong>Email</strong> dan <strong>WhatsApp</strong>{" "}
        per jenis dokumen (SPH, Invoice, Slip Gaji), dengan token placeholder seperti{" "}
        <code>{"{no_sph}"}</code>, <code>{"{nama_perusahaan}"}</code>,{" "}
        <code>{"{pic}"}</code>, dan pratinjau langsung.
      </p>

      <h2>Privasi</h2>
      <p>
        Centang untuk menyembunyikan nominal sensitif (Dasbor, Penggajian, Faktur,
        Proyek) di seluruh aplikasi, di balik ikon mata pada header — berguna saat
        berbagi layar.
      </p>

      <Callout>Menu Konfigurasi hanya dapat diakses oleh Admin.</Callout>
    </>
  );
}
