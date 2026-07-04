import { Screenshot } from "@/components/screenshot";

export default function ProfilPerusahaanPage() {
  return (
    <>
      <h1>Profil Perusahaan</h1>
      <p className="lede">
        Data profil perusahaan Anda sendiri (bukan klien) — dipakai sebagai kop dan
        footer pada dokumen yang diterbitkan (SPH, faktur, slip gaji), serta untuk
        perhitungan dokumen seperti rekening bank tujuan pembayaran.
      </p>
      <Screenshot src="/screenshots/profil-perusahaan.png" caption="Halaman Profil Perusahaan." />

      <h2>Yang diatur di sini</h2>
      <ul>
        <li>Logo, nama, dan alamat perusahaan.</li>
        <li>Rekening bank perusahaan untuk pembayaran dari klien.</li>
        <li>Penandatangan dokumen dan status NPWP/PKP.</li>
        <li>Email pengirim untuk dokumen yang dikirim ke klien.</li>
      </ul>
    </>
  );
}
