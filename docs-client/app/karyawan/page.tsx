import { Screenshot } from "@/components/screenshot";
import { Callout } from "@/components/callout";

export default function KaryawanPage() {
  return (
    <>
      <h1>Karyawan</h1>
      <p className="lede">
        Data induk karyawan, menjadi sumber untuk Penggajian dan penugasan pada Proyek.
      </p>

      <h2>Daftar Karyawan</h2>
      <p>
        Kolom tabel: No. Karyawan (<code>KRY/00001</code>), Nama, Jabatan, Status
        Kepegawaian, Status (Aktif/Terarsip), dan Tanggal Masuk. Dialog Filter menyaring
        berdasarkan <strong>Status Kepegawaian</strong> dan <strong>Status</strong> —
        tidak ada filter berdasarkan Jabatan.
      </p>
      <Screenshot src="/screenshots/karyawan-list.png" caption="Daftar Karyawan." />

      <h2>Menambah &amp; mengubah data</h2>
      <p>
        Klik <strong>Tambah Karyawan</strong> untuk membuka form baru, atau{" "}
        <strong>Ubah</strong> dari menu titik-tiga pada sebuah baris. Aksi{" "}
        <strong>Nonaktifkan</strong> tidak menghapus data — statusnya berubah menjadi
        Terarsip dan dapat diaktifkan kembali kapan saja lewat menu Ubah.
      </p>

      <h2>Detail karyawan</h2>
      <p>
        Menampilkan Masa Kerja (dihitung otomatis), Email, No. HP, Tanggal Masuk, gaji
        pokok, tunjangan, info bank, serta NPWP/PTKP untuk perhitungan pajak penggajian.
      </p>
      <Screenshot src="/screenshots/karyawan-detail.png" caption="Detail data seorang karyawan." />

      <Callout>
        Jabatan dan Status Kepegawaian dipilih dari daftar master yang dikelola sendiri
        oleh Admin di menu Konfigurasi &rarr; Daftar Pilihan (bukan enum tetap dan bukan
        diketik bebas) — status kepegawaian ini juga menentukan pengali gaji yang
        dipakai saat menghitung slip gaji di Penggajian.
      </Callout>
    </>
  );
}
