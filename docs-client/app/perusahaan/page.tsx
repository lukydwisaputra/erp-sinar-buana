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
        Dapat dicari dan difilter berdasarkan status (Aktif/Nonaktif) atau kota. Kolom
        PIC menampilkan avatar bertumpuk untuk setiap narahubung (arahkan kursor untuk
        nama lengkapnya). Klik sebuah baris untuk melihat ringkasan penawaran, proyek
        aktif, nilai kontrak, dan piutang perusahaan tersebut.
      </p>
      <Screenshot src="/screenshots/perusahaan-list.png" caption="Daftar Perusahaan." />

      <h2>Menambah / mengubah perusahaan</h2>
      <p>
        Klik <strong>Tambah Perusahaan</strong>, isi nama, alamat, kota, kabupaten, NPWP,
        dan email (opsional), lalu tambahkan minimal satu PIC (nama dan nomor HP wajib,
        email opsional). PIC pertama pada daftar otomatis menjadi kontak utama. Gunakan
        menu titik-tiga pada sebuah baris untuk <strong>Ubah</strong> atau{" "}
        <strong>Hapus</strong>.
      </p>
      <p>
        Panel detail menampilkan kartu &quot;Kontak PIC&quot; berisi nama, jabatan,
        telepon, dan email setiap PIC, selain ringkasan penawaran/proyek/piutang di atas.
      </p>
      <Screenshot src="/screenshots/perusahaan-detail.png" caption="Detail perusahaan — ringkasan dan daftar PIC." />

      <Callout>
        Sebaiknya nonaktifkan (bukan hapus) perusahaan yang sudah tidak digunakan lagi,
        agar riwayat penawaran/proyek/faktur yang pernah tercatat tetap dapat dirujuk —
        meski tombol pada menu aksi masih berlabel &quot;Hapus&quot;, gunakan toggle
        status Aktif/Nonaktif sebagai cara aman menghentikan penggunaan sebuah
        perusahaan.
      </Callout>
    </>
  );
}
