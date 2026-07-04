import { Screenshot } from "@/components/screenshot";
import { Callout } from "@/components/callout";

export default function ProyekPage() {
  return (
    <>
      <h1>Proyek</h1>
      <p className="lede">
        Manajemen proyek bergaya papan kerja (mirip ClickUp) untuk melacak pekerjaan dari
        SPH yang sudah <em>Deal</em> sampai selesai, lengkap dengan penugasan karyawan dan
        komentar berbasis waktu.
      </p>

      <h2>Daftar Proyek</h2>
      <p>
        Semua karyawan dapat mengakses daftar proyek sesuai penugasannya. Setiap proyek
        menampilkan perusahaan klien, layanan yang dikerjakan, status pekerjaan, dan nilai
        kontrak.
      </p>
      <Screenshot src="/screenshots/proyek-list.png" caption="Daftar Proyek." />

      <h2>Membuat proyek</h2>
      <p>
        Proyek biasanya dibuat otomatis dari SPH yang menjadi Deal, tapi juga bisa dibuat
        langsung untuk pekerjaan tanpa SPH. Satu proyek dapat memuat beberapa layanan
        sekaligus, masing-masing dengan jenis dokumennya sendiri.
      </p>
      <Screenshot src="/screenshots/proyek-create.png" caption="Form pembuatan proyek baru." />

      <h2>Detail proyek</h2>
      <p>
        Halaman detail proyek berisi milestone/checklist pekerjaan, penugasan tim,
        jadwal, komentar tim, serta realisasi RAB (biaya aktual dibandingkan anggaran)
        yang menjadi dasar perhitungan profitabilitas proyek.
      </p>
      <Screenshot src="/screenshots/proyek-detail.png" caption="Detail proyek — milestone, tim, dan realisasi RAB." />

      <Callout>
        Status pekerjaan proyek bisa dikustomisasi oleh Admin lewat menu Konfigurasi →
        Workflow Status, tanpa perlu bantuan developer.
      </Callout>
    </>
  );
}
