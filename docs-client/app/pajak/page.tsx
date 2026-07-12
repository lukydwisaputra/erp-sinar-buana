import { Screenshot } from "@/components/screenshot";
import { Callout } from "@/components/callout";

export default function PajakPage() {
  return (
    <>
      <h1>Pajak</h1>
      <p className="lede">
        Pusat kewajiban pajak perusahaan — bukan hanya PPN/PPh 23 dari faktur, tapi juga
        PPh 21 dan BPJS (Kesehatan &amp; Ketenagakerjaan) yang muncul otomatis dari
        Penggajian.
      </p>
      <p>
        Empat kartu ringkasan di atas tabel menunjukkan Total Belum Setor, jumlah
        Terlambat, jumlah Jatuh Tempo 7 Hari, dan jumlah Bukti Potong Belum diterima.
      </p>
      <Screenshot src="/screenshots/pajak.png" caption="Ringkasan KPI dan daftar kewajiban pajak." />

      <h2>Status</h2>
      <ul>
        <li>
          <strong>Belum Disetor</strong>, <strong>Terlambat</strong> (lewat tanggal jatuh
          tempo), atau <strong>Sudah Disetor</strong>.
        </li>
        <li>
          Khusus entri PPh 23: kolom <strong>Bukti Potong</strong> melacak terpisah
          apakah bukti potong sudah diterima dari klien — ini tidak sama dengan status
          Disetor.
        </li>
      </ul>
      <p>
        Dialog Filter menyaring berdasarkan Jenis Pajak dan Status (bisa pilih lebih dari
        satu), ditambah pencarian bebas berdasarkan keterangan.
      </p>

      <h2>Menyetor &amp; membatalkan</h2>
      <p>
        <strong>Tandai Selesai</strong> meminta tanggal setor dan NTPN (nomor bukti
        setor, opsional); untuk PPh 23 juga ada centang &quot;Bukti potong sudah
        diterima&quot;. Entri yang sudah disetor bisa <strong>dibatalkan</strong>{" "}
        kembali ke Belum Disetor bila keliru — jurnal arus kas yang sudah tercatat dari
        penyetoran sebelumnya <strong>tidak</strong> ikut terhapus saat dibatalkan.
      </p>

      <h2>Konfigurasi PPh Badan</h2>
      <p>
        Kartu tersendiri untuk memilih metode PPh Badan: PPh Final 0,5% (PP 55/2022)
        untuk omzet ≤ Rp4,8 miliar/tahun, atau PPh Badan Normal 22%, beserta ambang
        batas omzetnya.
      </p>

      <Callout>
        Kewajiban yang mendekati tenggat akan muncul di Perlu Perhatian pada Dasbor.
        Tarif PPN/PPh 23 untuk sebuah faktur ditentukan saat Faktur Induk dibuat (menu
        Faktur), bukan diatur secara terpusat di halaman ini.
      </Callout>
    </>
  );
}
