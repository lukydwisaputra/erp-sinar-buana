import { Screenshot } from "@/components/screenshot";
import { Callout } from "@/components/callout";

export default function PenggajianPage() {
  return (
    <>
      <h1>Penggajian</h1>
      <p className="lede">
        Penggajian diproses per <strong>batch</strong> (satu periode gaji, mis. satu
        bulan), yang berisi slip gaji untuk setiap karyawan yang diikutsertakan.
      </p>

      <h2>Daftar batch penggajian</h2>
      <Screenshot src="/screenshots/penggajian-list.png" caption="Daftar batch penggajian per periode." />

      <h2>Membuat batch baru</h2>
      <p>
        Pilih periode dan karyawan yang akan digaji. Komponen gaji (tunjangan, potongan)
        dan pengali status kepegawaian (mis. masa probation) diambil otomatis dari data
        Karyawan dan Konfigurasi.
      </p>
      <Screenshot src="/screenshots/penggajian-create.png" caption="Membuat batch penggajian baru." />

      <h2>Detail batch &amp; slip gaji</h2>
      <p>
        Buka sebuah batch untuk melihat daftar slip di dalamnya, tandai status pembayaran
        per slip, lalu buka salah satu slip untuk melihat rincian perhitungan gaji
        karyawan tersebut.
      </p>
      <Screenshot src="/screenshots/penggajian-batch.png" caption="Detail batch — daftar slip gaji karyawan." />
      <Screenshot src="/screenshots/penggajian-slip.png" caption="Rincian slip gaji satu karyawan." />

      <Callout>
        Setiap slip yang dibayarkan otomatis tercatat sebagai pengeluaran di modul Arus
        Kas — tidak perlu dicatat ulang secara manual.
      </Callout>
    </>
  );
}
