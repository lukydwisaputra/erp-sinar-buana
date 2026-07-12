import { Screenshot } from "@/components/screenshot";

export default function KatalogPage() {
  return (
    <>
      <h1>Katalog Layanan</h1>
      <p className="lede">
        Daftar jenis layanan yang ditawarkan perusahaan sebagai master data — bukan teks
        bebas — sehingga konsisten dipakai di setiap Penawaran dan Proyek.
      </p>

      <h2>Daftar Layanan</h2>
      <p>
        Setiap layanan bernomor otomatis (<code>LYN/00001</code>). Dialog Filter
        menyaring berdasarkan Kewenangan dan Status (Aktif/Terarsip). Klik{" "}
        <strong>Tambah Layanan</strong> untuk membuat layanan baru, atau gunakan menu
        titik-tiga pada sebuah baris untuk <strong>Ubah</strong> atau{" "}
        <strong>Hapus</strong>.
      </p>
      <Screenshot src="/screenshots/katalog-list.png" caption="Daftar Katalog Layanan." />

      <h2>Detail layanan</h2>
      <p>
        Setiap layanan memiliki jenis dokumen, kewenangan, dasar hukum, dan harga standar
        opsional sebagai acuan saat menyusun penawaran, serta dapat dikaitkan ke template
        milestone default agar proyek baru langsung memiliki checklist awal. Centang{" "}
        <strong>Berulang</strong> untuk layanan yang sifatnya rutin (mis. laporan
        semester). Ringkasan &quot;Dipakai di SPH&quot; dan &quot;Proyek&quot; pada
        detail menghitung jumlah pemakaian layanan tersebut.
      </p>
      <Screenshot src="/screenshots/katalog-detail.png" caption="Detail sebuah layanan." />
    </>
  );
}
