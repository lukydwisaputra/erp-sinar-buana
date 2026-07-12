import { Screenshot } from "@/components/screenshot";
import { Callout } from "@/components/callout";

export default function ArusKasPage() {
  return (
    <>
      <h1>Arus Kas</h1>
      <p className="lede">
        Riwayat uang masuk (kredit) dan keluar (debit) perusahaan — sepenuhnya
        <strong> tercatat otomatis</strong> dari modul lain (faktur yang lunas, gaji yang
        dibayarkan, kewajiban pajak yang disetor). Halaman ini bersifat baca-saja; tidak
        ada lagi form pencatatan transaksi manual.
      </p>

      <h2>Ringkasan &amp; tren</h2>
      <p>
        Di atas tabel terdapat tiga kartu ringkasan (Saldo, Total Pemasukan, Total
        Pengeluaran — masing-masing dengan persentase perubahan dari bulan sebelumnya)
        serta kurva tren bulanan yang membandingkan Pemasukan vs Pengeluaran untuk
        rentang tanggal yang sedang difilter.
      </p>
      <Screenshot src="/screenshots/arus-kas-list.png" caption="Ringkasan, tren, dan daftar transaksi arus kas." />

      <h2>Menyaring transaksi</h2>
      <p>
        Dialog Filter menyaring berdasarkan Jenis (Pemasukan/Pengeluaran), Kategori,
        Sumber (Manual / Otomatis-Faktur / Otomatis-Penggajian / Otomatis-Pajak), dan
        rentang tanggal. Kolom <strong>Sumber</strong> pada tabel membedakan entri manual
        dari yang tercatat otomatis; entri yang dibatalkan tetap tampil dengan tanda
        coret, bukan disembunyikan.
      </p>

      <Callout>
        Kategori transaksi dapat disesuaikan sendiri oleh Admin lewat menu Konfigurasi,
        tanpa perlu bantuan developer. Pengeluaran proyek (realisasi RAB) dicatat dari
        halaman detail Proyek, bukan dari halaman ini.
      </Callout>
    </>
  );
}
