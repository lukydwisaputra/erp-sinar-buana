import { companyProfileFixture } from "@/lib/fixtures/company-profile";
import { formatRupiah, formatTanggalPanjang as tglPanjang } from "@/lib/format";
import { calcSlip, type SlipGaji } from "@/lib/schemas/penggajian";
import { DocumentPage } from "@/components/shared/document/document-page";
import { DocumentLetterhead } from "@/components/shared/document/document-letterhead";

function periodStr(mulai: string, selesai: string) {
  return `${tglPanjang(mulai)} – ${tglPanjang(selesai)}`;
}

function rupiah(v: number) {
  return v === 0 ? "–" : formatRupiah(v);
}

const cell = "px-4 py-1 text-[11px]";
const cellR = `${cell} text-right font-mono tabular-nums`;
const divider = "border-t border-[var(--doc-rule)]";

export function SlipDocument({
  slip,
  periode,
}: {
  slip: SlipGaji;
  periode: { mulai: string; selesai: string };
}) {
  const companyProfile = companyProfileFixture.current;
  const { gajiPokokEfektif, potonganTotal, penggajianKotor, penggajianBersih } = calcSlip(slip);
  const totalPotongan = slip.pph21 + potonganTotal;
  const tglPaid = slip.paidAt ? tglPanjang(slip.paidAt) : tglPanjang(new Date().toISOString());
  const tunjanganLines = slip.components.filter((c) => c.kind === "tunjangan");
  const potonganLines = slip.components.filter((c) => c.kind === "potongan");

  return (
    <DocumentPage header={<DocumentLetterhead />}>
      <div className="px-8 py-4 text-[11px] leading-snug space-y-4">
        {/* Title */}
        <div className="text-center space-y-0.5">
          <p className="text-base font-bold tracking-[0.25em]">SLIP GAJI</p>
          <p className="text-[11px] text-muted-foreground">Periode: {periodStr(periode.mulai, periode.selesai)}</p>
        </div>

        {/* Employee meta */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 border border-[var(--doc-rule)] rounded p-3">
          <div className="space-y-0.5">
            <div className="flex gap-2"><span className="w-20 text-muted-foreground">Nama</span><span>: {slip.karyawanNama}</span></div>
            <div className="flex gap-2"><span className="w-20 text-muted-foreground">Jabatan</span><span>: {slip.jabatan}</span></div>
            <div className="flex gap-2"><span className="w-20 text-muted-foreground">Status</span><span>: {slip.statusKepegawaian}</span></div>
          </div>
          <div className="space-y-0.5 text-right">
            <div><span className="text-muted-foreground">No. Slip </span><span className="font-mono">{slip.number ?? "—"}</span></div>
            <div><span className="text-muted-foreground">ID Karyawan </span><span className="font-mono">{slip.karyawanId}</span></div>
          </div>
        </div>

        {/* Earnings table */}
        <table className="w-full border-collapse border border-[var(--doc-rule)]">
          <thead>
            <tr className="bg-[var(--doc-blue-soft)]">
              <th className={`${cell} text-left font-bold`} colSpan={2}>PENDAPATAN</th>
            </tr>
          </thead>
          <tbody>
            <tr><td className={cell}>Gaji Pokok</td><td className={cellR}>{formatRupiah(slip.gajiPokok)}</td></tr>
            {slip.pengali !== 1 && (
              <>
                <tr className="text-muted-foreground">
                  <td className={cell}>Pengali ({slip.statusKepegawaian})</td>
                  <td className={cellR}>{slip.pengali}</td>
                </tr>
                <tr className="font-bold">
                  <td className={cell}>Gaji Pokok Efektif</td>
                  <td className={cellR}>{formatRupiah(gajiPokokEfektif)}</td>
                </tr>
              </>
            )}
            {tunjanganLines.map((c) => (
              <tr key={c.id}><td className={cell}>{c.name}</td><td className={cellR}>{formatRupiah(c.amount)}</td></tr>
            ))}
            <tr><td className={cell}>Lembur</td><td className={cellR}>{rupiah(slip.lembur)}</td></tr>
            <tr><td className={cell}>Bonus</td><td className={cellR}>{rupiah(slip.bonus)}</td></tr>
            <tr className={`${divider} font-bold bg-[var(--doc-blue-soft)]`}>
              <td className={cell}>PENGGAJIAN KOTOR</td>
              <td className={cellR}>{formatRupiah(penggajianKotor)}</td>
            </tr>
          </tbody>
        </table>

        {/* Deductions */}
        <table className="w-full border-collapse border border-[var(--doc-rule)]">
          <thead>
            <tr className="bg-[var(--doc-blue-soft)]">
              <th className={`${cell} text-left font-bold`} colSpan={2}>POTONGAN</th>
            </tr>
          </thead>
          <tbody>
            <tr><td className={cell}>PPh 21</td><td className={cellR}>{formatRupiah(slip.pph21)}</td></tr>
            {potonganLines.map((c) => (
              <tr key={c.id}>
                <td className={cell}>{c.name}{c.isEmployerPortion ? " (Perusahaan)" : ""}</td>
                <td className={cellR}>{c.isEmployerPortion ? "–" : formatRupiah(c.amount)}</td>
              </tr>
            ))}
            <tr className={`${divider} font-bold bg-[var(--doc-blue-soft)]`}>
              <td className={cell}>TOTAL POTONGAN</td>
              <td className={cellR}>{formatRupiah(totalPotongan)}</td>
            </tr>
          </tbody>
        </table>

        {/* Net pay */}
        <table className="w-full border-collapse border border-[var(--doc-rule)]">
          <tbody>
            <tr className="bg-[var(--doc-blue)] text-white font-bold text-xs">
              <td className={cell}>PENGGAJIAN BERSIH (Take-Home)</td>
              <td className={cellR}>{formatRupiah(penggajianBersih)}</td>
            </tr>
          </tbody>
        </table>

        {/* Bank */}
        <div className="border border-[var(--doc-rule)] rounded p-3 space-y-0.5">
          <p className="font-medium">Dibayarkan ke:</p>
          <p>{slip.bankNama} &bull; {slip.bankNomor} &bull; a/n {slip.bankAtasNama}</p>
        </div>

        {/* Signature */}
        <div className="flex justify-end pt-10 pb-4 pr-4">
          <div className="text-center">
            <p>{companyProfile.kota}, {tglPaid}</p>
            <div className="mt-24">
              <div className="border-b border-[var(--doc-rule)] w-44 mx-auto" />
              <p className="font-medium mt-1">{companyProfile.direktur.nama}</p>
              <p className="text-muted-foreground">{companyProfile.direktur.jabatan}</p>
            </div>
          </div>
        </div>
      </div>
    </DocumentPage>
  );
}
