import { Screenshot } from "@/components/screenshot";
import { Callout } from "@/components/callout";

export default function PenggunaPage() {
  return (
    <>
      <h1>Pengguna</h1>
      <p className="lede">
        Admin mengelola akun karyawan yang boleh mengakses aplikasi dari sini, termasuk
        peran (role) masing-masing.
      </p>
      <Screenshot src="/screenshots/pengguna-list.png" caption="Daftar Pengguna." />

      <h2>Peran yang tersedia</h2>
      <ul>
        <li><strong>Admin / Owner</strong> — akses penuh ke seluruh modul.</li>
        <li><strong>Keuangan</strong> — Faktur, Penggajian, Arus Kas, Pajak.</li>
        <li><strong>Marketing / Sales</strong> — Perusahaan, Katalog, Penawaran.</li>
        <li><strong>Tim Teknis</strong> — Proyek sesuai penugasan.</li>
        <li><strong>Viewer</strong> — hanya melihat modul yang diizinkan.</li>
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
