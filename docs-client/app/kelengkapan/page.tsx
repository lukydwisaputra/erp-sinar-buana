import { Screenshot } from "@/components/screenshot";

export default function KelengkapanPage() {
  return (
    <>
      <h1>Kelengkapan Administrasi</h1>
      <p className="lede">
        Melacak kelengkapan dokumen administratif yang diperlukan untuk sebuah
        penawaran/proyek (mis. surat kuasa, dokumen legal klien), terpisah dari isi teknis
        pekerjaan.
      </p>

      <h2>Daftar kelengkapan</h2>
      <Screenshot src="/screenshots/kelengkapan-list.png" caption="Daftar Kelengkapan Administrasi." />

      <h2>Detail kelengkapan</h2>
      <p>
        Menampilkan status setiap dokumen yang diperlukan, dengan kemampuan mengunggah
        berkas pendukung.
      </p>
      <Screenshot src="/screenshots/kelengkapan-detail.png" caption="Detail kelengkapan administrasi." />
    </>
  );
}
