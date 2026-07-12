import { Screenshot } from "@/components/screenshot";
import { Callout } from "@/components/callout";

export default function PengunaPage() {
  return (
    <>
      <h1>Pengguna</h1>
      <p className="lede">
        Admin mengelola akun karyawan (dan akun klien) yang boleh mengakses aplikasi dari
        sini, termasuk peran (role) masing-masing serta undangan/atur-ulang sandinya.
      </p>
      <Screenshot src="/screenshots/pengguna-list.png" caption="Daftar Pengguna." />

      <h2>Membuat akun</h2>
      <p>
        Klik <strong>Tambah Akun Pengguna</strong>, isi Nama, Email (untuk login), dan
        Peran. Untuk peran staf (Keuangan/Sales/Tim Teknis), pilih{" "}
        <strong>Tautan Karyawan</strong> yang menghubungkan akun ke data karyawan
        bersangkutan. Untuk peran <strong>Viewer</strong>, pilih{" "}
        <strong>Tautan Perusahaan Klien</strong> — Viewer di aplikasi ini selalu berarti
        akun narahubung (PIC) eksternal milik satu perusahaan klien tertentu, dibatasi
        hanya melihat SPH/Proyek/Faktur milik perusahaan tersebut, bukan akun internal
        dengan hak lihat terbatas secara umum.
      </p>
      <p>
        Setelah disimpan, dialog <strong>Tautan Undangan</strong> muncul berisi tautan
        (<code>/accept-invite?token=...</code>) beserta tombol salin — bagikan tautan ini
        secara manual (mis. lewat chat) ke karyawan/klien bersangkutan untuk mengatur
        sandi pertama kalinya.
      </p>

      <h2>Status &amp; aksi akun</h2>
      <p>
        Setiap akun berstatus <strong>Aktif</strong>, <strong>Menunggu Aktivasi</strong>,
        atau <strong>Nonaktif</strong>. Menu titik-tiga pada sebuah baris menyediakan:
      </p>
      <ul>
        <li><strong>Kirim Ulang Undangan</strong> — hanya muncul untuk akun Menunggu Aktivasi; membuka ulang dialog Tautan Undangan.</li>
        <li><strong>Reset Sandi</strong> — hanya muncul untuk akun Aktif; membuka dialog tautan atur-ulang sandi (<code>/reset-password?token=...</code>) untuk dibagikan manual. Pengguna sendiri juga bisa meminta ini lewat &quot;Lupa sandi?&quot; di halaman Masuk, yang mengirimkan tautan yang sama otomatis lewat email.</li>
        <li><strong>Nonaktifkan</strong> / <strong>Aktifkan</strong> — mengalihkan status tanpa menghapus data.</li>
      </ul>

      <h2>Peran yang tersedia</h2>
      <ul>
        <li><strong>Admin / Owner</strong> — akses penuh ke seluruh modul.</li>
        <li><strong>Keuangan</strong> — Faktur, Penggajian, Arus Kas, Pajak, serta Karyawan dan Kelengkapan.</li>
        <li><strong>Marketing / Sales</strong> — Perusahaan, Katalog, Penawaran, Proyek, serta Karyawan dan Kelengkapan.</li>
        <li><strong>Tim Teknis</strong> — Proyek sesuai penugasan, serta Karyawan dan Kelengkapan.</li>
        <li><strong>Viewer</strong> — akun klien eksternal, hanya melihat data perusahaannya sendiri.</li>
      </ul>
      <p>
        Menu di sisi kiri aplikasi otomatis menyesuaikan — pengguna hanya melihat modul
        yang sesuai dengan perannya.
      </p>

      <Callout>
        Akun tidak pernah dihapus permanen, hanya dinonaktifkan — riwayat pekerjaan
        seorang karyawan tetap tersimpan meski akunnya sudah tidak aktif.
      </Callout>
    </>
  );
}
