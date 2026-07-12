import { Screenshot } from "@/components/screenshot";
import { Callout } from "@/components/callout";

export default function FakturPage() {
  return (
    <>
      <h1>Faktur</h1>
      <p className="lede">
        Penagihan mengikuti hierarki <strong>Proyek → Faktur Induk → Invoice Termin</strong>.
        Satu proyek bisa memiliki beberapa Faktur Induk, dan satu Faktur Induk dibagi
        menjadi beberapa termin sesuai skema yang ditentukan saat pembuatan (mis. 40% /
        40% / 20%). Faktur Induk baru dibuat dari sebuah proyek yang sudah berjalan,
        bukan langsung dari halaman ini.
      </p>

      <h2>Daftar Faktur</h2>
      <p>
        Status invoice termin hanya ada tiga: <strong>Belum Lunas</strong>,{" "}
        <strong>Lunas</strong>, atau <strong>Batal</strong> — tidak ada status
        &quot;Draf&quot; maupun &quot;Jatuh Tempo&quot; tersendiri (tanggal jatuh tempo
        tetap tercatat sebagai tanggal pada setiap termin).
      </p>
      <Screenshot src="/screenshots/faktur-list.png" caption="Daftar Faktur." />

      <h2>Membuat Faktur Induk</h2>
      <p>
        Dari proyek yang berjalan, pilih layanan mana yang akan ditagihkan, lalu susun
        skema termin secara bebas — tambah/hapus baris, masing-masing dengan label dan
        persentase sendiri, dengan indikator total yang harus mencapai 100%. Skema termin
        ini <strong>tidak dapat diubah lagi setelah dibuat</strong>, karena termin-termin
        di dalamnya sudah dibangkitkan berdasarkan skema tersebut.
      </p>

      <h2>Detail Faktur Induk</h2>
      <p>
        Menampilkan progres Skema Termin (setiap tahap ditandai &quot;Sudah dibuat&quot;
        atau &quot;Belum dibuat&quot;) dan daftar Invoice Termin yang sudah dibangkitkan.
        Tombol untuk membangkitkan termin berikutnya meminta tanggal, tanggal jatuh
        tempo, rekening bank tujuan, dan catatan. Setiap termin punya aksi{" "}
        <strong>Lihat Dokumen</strong>, <strong>Kirim</strong> (ke kontak PIC),{" "}
        <strong>Tandai Lunas</strong>, dan <strong>Batalkan</strong>.
      </p>
      <Screenshot src="/screenshots/faktur-detail.png" caption="Detail Faktur Induk — skema termin dan daftar invoice termin." />

      <h2>Mengubah Faktur Induk</h2>
      <p>
        Halaman Ubah menampilkan form di sisi kiri dan pratinjau dokumen langsung di sisi
        kanan — dapat mengganti layanan yang ditagihkan, total biaya, dan catatan, dengan
        pemilih termin untuk melihat pratinjau dokumen tiap termin. Halaman ini terkunci
        (mode baca-saja) begitu Faktur Induk berstatus Lunas atau Batal.
      </p>

      <p>
        Setiap invoice termin menghitung DPP, PPN, dan PPh 23 sesuai tarif yang berlaku
        saat Faktur Induk dibuat, lalu menghasilkan dokumen siap kirim ke klien lengkap
        dengan info rekening bank tujuan pembayaran.
      </p>

      <Callout>
        Faktur Induk yang sudah <strong>Lunas</strong> atau <strong>Batal</strong> tidak
        dapat diubah lagi.
      </Callout>
    </>
  );
}
