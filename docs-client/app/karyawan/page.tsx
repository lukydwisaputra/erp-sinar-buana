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
        Dapat difilter berdasarkan jabatan atau status kepegawaian (Tetap / Kontrak /
        Magang).
      </p>
      <Screenshot src="/screenshots/karyawan-list.png" caption="Daftar Karyawan." />

      <h2>Detail karyawan</h2>
      <p>
        Berisi gaji pokok, status kepegawaian (yang menentukan pengali gaji), tunjangan
        default, info bank, serta NPWP/PTKP untuk perhitungan pajak penggajian.
      </p>
      <Screenshot src="/screenshots/karyawan-detail.png" caption="Detail data seorang karyawan." />

      <Callout>
        Jabatan dan status kepegawaian dipilih dari daftar master (dikelola di menu
        Konfigurasi), bukan diketik bebas — ini menjaga konsistensi data untuk laporan.
      </Callout>
    </>
  );
}
