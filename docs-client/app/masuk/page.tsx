import { Screenshot } from "@/components/screenshot";
import { Callout } from "@/components/callout";

export default function MasukPage() {
  return (
    <>
      <h1>Masuk &amp; Undangan Akun</h1>
      <p className="lede">
        Tidak ada pendaftaran mandiri — setiap akun dibuat oleh Admin melalui menu
        Pengguna, lalu diaktifkan lewat tautan undangan. Bagian ini menjelaskan alur
        masuk dan aktivasi akun.
      </p>

      <h2>Masuk</h2>
      <p>
        Buka aplikasi, isi email dan sandi yang diberikan Admin, lalu klik <strong>Masuk</strong>.
        Sesi tetap aktif di perangkat yang sama sampai Anda keluar atau akun dinonaktifkan.
      </p>
      <Screenshot src="/screenshots/masuk-login.png" caption="Halaman Masuk." />

      <h2>Aktivasi akun baru (undangan)</h2>
      <p>
        Saat Admin membuat akun baru, sebuah tautan undangan dibuat. Buka tautan tersebut
        untuk mengatur sandi pertama kali, lalu Anda akan otomatis masuk ke aplikasi.
      </p>

      <h2>Lupa sandi</h2>
      <p>
        Klik <strong>Lupa sandi?</strong> di halaman Masuk. Admin dapat membuatkan tautan
        atur ulang sandi baru melalui menu Pengguna bila diperlukan.
      </p>

      <Callout>
        Belum ada pengiriman email otomatis — tautan undangan/atur ulang sandi saat ini
        ditampilkan langsung di menu Pengguna oleh Admin, lalu dibagikan secara manual
        (mis. lewat chat) ke karyawan bersangkutan.
      </Callout>
    </>
  );
}
