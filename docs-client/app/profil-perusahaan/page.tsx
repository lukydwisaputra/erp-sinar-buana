import { Screenshot } from "@/components/screenshot";
import { Callout } from "@/components/callout";

export default function ProfilPerusahaanPage() {
  return (
    <>
      <h1>Profil Perusahaan</h1>
      <p className="lede">
        Data profil perusahaan Anda sendiri (bukan klien) — dipakai sebagai kop dan
        footer pada dokumen yang diterbitkan (SPH, faktur, slip gaji).
      </p>
      <Screenshot src="/screenshots/profil-perusahaan.png" caption="Halaman Profil Perusahaan." />

      <h2>Identitas &amp; kontak</h2>
      <ul>
        <li>Logo, nama, tagline, dan alamat perusahaan (alamat berupa daftar baris yang bisa ditambah/dihapus).</li>
        <li>Kota, telepon, website, dan email.</li>
      </ul>

      <h3>Mengunggah logo</h3>
      <p>
        Kotak pratinjau logo menunjukkan &quot;Belum ada logo&quot; bila kosong. Klik{" "}
        <strong>Unggah Logo</strong> untuk memilih berkas, atau <strong>Ganti Logo</strong>{" "}
        bila sudah ada logo sebelumnya; tombol <strong>Hapus</strong> mengosongkannya
        kembali. Logo yang kosong membuat dokumen menampilkan lencana &quot;SBMJ&quot;
        bawaan sebagai gantinya.
      </p>

      <h2>Penandatangan</h2>
      <p>
        Pilih karyawan (dari data Karyawan) yang menjadi penandatangan default dokumen,
        beserta NPWP perusahaan dan status PKP (Pengusaha Kena Pajak).
      </p>

      <Callout>
        Rekening bank perusahaan <strong>tidak lagi diatur di halaman ini</strong> —
        kelola di Konfigurasi &rarr; Daftar Pilihan (kategori Rekening Bank), lalu
        tandai satu rekening sebagai default agar tampil pada dokumen.
      </Callout>
    </>
  );
}
