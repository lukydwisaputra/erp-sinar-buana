import { Screenshot } from "@/components/screenshot";
import { Callout } from "@/components/callout";

export default function ArusKasPage() {
  return (
    <>
      <h1>Arus Kas</h1>
      <p className="lede">
        Pencatatan uang masuk (kredit) dan keluar (debit) perusahaan. Sebagian entri
        tercatat otomatis dari modul lain (faktur yang lunas, gaji yang dibayarkan,
        kewajiban pajak yang disetor); sisanya dicatat manual.
      </p>

      <h2>Daftar transaksi</h2>
      <Screenshot src="/screenshots/arus-kas-list.png" caption="Daftar transaksi arus kas." />

      <h2>Mencatat transaksi manual</h2>
      <p>
        Pilih jenis (Pemasukan/Pengeluaran), kategori, dan nominal. Transaksi dapat
        dikaitkan ke sebuah proyek — pengeluaran yang dikaitkan ke proyek akan otomatis
        dihitung sebagai realisasi RAB proyek tersebut.
      </p>
      <Screenshot src="/screenshots/arus-kas-create.png" caption="Mencatat transaksi arus kas baru." />

      <Callout>
        Kategori transaksi dapat disesuaikan sendiri oleh Admin lewat menu Konfigurasi,
        tanpa perlu bantuan developer.
      </Callout>
    </>
  );
}
