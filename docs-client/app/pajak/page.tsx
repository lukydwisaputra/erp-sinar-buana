import { Screenshot } from "@/components/screenshot";
import { Callout } from "@/components/callout";

export default function PajakPage() {
  return (
    <>
      <h1>Pajak</h1>
      <p className="lede">
        Pusat kewajiban pajak perusahaan (PPN, PPh 23, dan lainnya) yang diturunkan dari
        faktur nyata, dengan tarif yang bisa dikonfigurasi.
      </p>
      <Screenshot src="/screenshots/pajak.png" caption="Daftar kewajiban pajak — Belum Setor / Disetor." />

      <h2>Cara kerja</h2>
      <ul>
        <li>Setiap invoice termin otomatis menghasilkan entri kewajiban PPN/PPh 23.</li>
        <li>
          Tandai kewajiban sebagai <strong>Disetor</strong> setelah pembayaran pajak
          dilakukan ke kas negara.
        </li>
        <li>Kewajiban yang mendekati tenggat akan muncul di Pusat Perhatian pada Dasbor.</li>
      </ul>

      <Callout>
        Rumus perhitungan (DPP, PPN 12%, PPh 23 2%) mengikuti aturan yang berlaku dan
        tarifnya dapat disesuaikan lewat menu Konfigurasi bila ada perubahan regulasi.
      </Callout>
    </>
  );
}
