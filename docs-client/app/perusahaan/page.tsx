import { Screenshot } from "@/components/screenshot";
import { Callout } from "@/components/callout";

export default function PerusahaanPage() {
  return (
    <>
      <h1>Perusahaan</h1>
      <p className="lede">
        Data induk perusahaan klien beserta narahubungnya (PIC). Data ini menjadi rujukan
        untuk Penawaran, Proyek, dan Faktur — sekali diisi di sini, otomatis tersedia
        sebagai pilihan di modul lain.
      </p>

      <h2>Daftar Perusahaan</h2>
      <p>
        Dapat dicari dan difilter berdasarkan status (Aktif/Nonaktif) atau kota. Klik
        sebuah baris untuk melihat ringkasan penawaran, proyek aktif, nilai kontrak, dan
        piutang perusahaan tersebut.
      </p>
      <Screenshot src="/screenshots/perusahaan-list.png" caption="Daftar Perusahaan." />

      <h2>Menambah / mengubah perusahaan</h2>
      <p>
        Klik <strong>Tambah Perusahaan</strong>, isi nama, alamat, kota, kabupaten, dan
        NPWP, lalu tambahkan minimal satu PIC (nama dan nomor HP wajib). PIC pertama pada
        daftar otomatis menjadi kontak utama.
      </p>
      <Screenshot src="/screenshots/perusahaan-detail.png" caption="Detail perusahaan — ringkasan dan daftar PIC." />

      <Callout>
        Sebaiknya nonaktifkan (bukan hapus) perusahaan yang sudah tidak digunakan lagi,
        agar riwayat penawaran/proyek/faktur yang pernah tercatat tetap dapat dirujuk.
      </Callout>
    </>
  );
}
