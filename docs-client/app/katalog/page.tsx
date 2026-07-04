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
      <Screenshot src="/screenshots/katalog-list.png" caption="Daftar Katalog Layanan." />

      <h2>Detail layanan</h2>
      <p>
        Setiap layanan memiliki jenis dokumen, kewenangan, dasar hukum, dan harga standar
        opsional sebagai acuan saat menyusun penawaran. Layanan juga bisa dikaitkan ke
        template milestone default agar proyek baru langsung memiliki checklist awal.
      </p>
      <Screenshot src="/screenshots/katalog-detail.png" caption="Detail sebuah layanan." />
    </>
  );
}
