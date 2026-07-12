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
      <p>Gunakan pemilih bulan di toolbar untuk menyaring batch berdasarkan periode.</p>
      <Screenshot src="/screenshots/penggajian-list.png" caption="Daftar batch penggajian per periode." />

      <h2>Membuat batch baru</h2>
      <p>
        Form pembuatan batch adalah wizard dua langkah: <strong>(1) Pilih Karyawan</strong>{" "}
        — tabel yang bisa dicari dan disaring berdasarkan Status Kepegawaian, dengan
        pilih-semua — lalu <strong>(2) Komponen Gaji</strong>, tempat setiap karyawan
        terpilih diatur Lembur, Bonus, PPh 21, serta tunjangan/potongannya (nilai bawaan
        diambil otomatis dari data Karyawan dan Konfigurasi, lalu bisa disesuaikan per
        karyawan). Footer menampilkan Total Kotor dan Total Bersih yang berjalan
        langsung; batch tidak bisa disimpan bila ada slip dengan gaji bersih negatif.
      </p>
      <Screenshot src="/screenshots/penggajian-create.png" caption="Membuat batch penggajian baru." />

      <h2>Detail batch &amp; status pembayaran</h2>
      <p>
        Header batch menampilkan Total Kotor/Total Bersih dan jumlah slip yang sudah
        dibayar. Setiap slip memiliki menu aksi <strong>Lihat Slip</strong>,{" "}
        <strong>Tandai Dibayar</strong>, atau <strong>Batalkan</strong> — tiga status:
        Menunggu Pembayaran, Sudah Dibayar, dan Batal. Komponen gaji sebuah slip terkunci
        (tidak bisa diubah) begitu statusnya bukan lagi Menunggu Pembayaran.
      </p>
      <Screenshot src="/screenshots/penggajian-batch.png" caption="Detail batch — daftar slip gaji karyawan." />

      <h2>Slip gaji</h2>
      <p>
        Menampilkan rincian perhitungan gaji satu karyawan sebagai dokumen yang bisa{" "}
        <strong>diunduh</strong> (cetak/PDF) atau <strong>dikirim</strong> langsung ke
        email/nomor karyawan tersebut, lengkap dengan konfirmasi Tandai Dibayar/Batalkan
        dari halaman ini juga.
      </p>
      <Screenshot src="/screenshots/penggajian-slip.png" caption="Rincian slip gaji satu karyawan." />

      <Callout>
        Menandai slip sebagai <strong>Sudah Dibayar</strong> otomatis mencatatnya sebagai
        pengeluaran di modul Arus Kas, dan — bila relevan (mis. PPh 21) — juga membuat
        entri kewajiban baru di modul Pajak. Tidak perlu dicatat ulang secara manual di
        kedua modul tersebut.
      </Callout>
    </>
  );
}
