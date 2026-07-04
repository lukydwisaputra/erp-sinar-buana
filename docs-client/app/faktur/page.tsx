import { Screenshot } from "@/components/screenshot";
import { Callout } from "@/components/callout";

export default function FakturPage() {
  return (
    <>
      <h1>Faktur</h1>
      <p className="lede">
        Penagihan mengikuti hierarki <strong>Proyek → Faktur Induk → Invoice Termin</strong>.
        Satu proyek bisa memiliki beberapa Faktur Induk, dan satu Faktur Induk bisa dibagi
        menjadi beberapa termin (mis. 40% / 40% / 20%) sesuai kesepakatan dengan klien.
      </p>

      <h2>Daftar Faktur</h2>
      <p>
        Menampilkan semua faktur beserta statusnya: <strong>Draf</strong>,
        <strong> Belum Lunas</strong>, <strong>Jatuh Tempo</strong>, <strong>Lunas</strong>,
        atau <strong>Dibatalkan</strong>. Faktur baru dibuat dari sebuah proyek yang sudah
        berjalan, bukan langsung dari halaman ini.
      </p>
      <Screenshot src="/screenshots/faktur-list.png" caption="Daftar Faktur." />

      <h2>Dokumen faktur &amp; perhitungan pajak</h2>
      <p>
        Setiap invoice termin menghitung PPN dan PPh 23 secara otomatis mengikuti tarif
        yang berlaku (dapat dikonfigurasi di menu Konfigurasi), lalu menghasilkan dokumen
        siap kirim ke klien.
      </p>
      <Screenshot src="/screenshots/faktur-detail.png" caption="Contoh dokumen faktur/invoice termin." />

      <Callout>
        Faktur yang sudah <strong>Lunas</strong> tidak dapat diubah. Pembatalan faktur
        juga membatalkan status terkait pada penawaran/proyek asalnya.
      </Callout>
    </>
  );
}
