import { companyProfile } from "@/lib/company-profile";
import { formatRupiah } from "@/lib/format";
import { terbilang } from "@/lib/terbilang";
import { computeFaktur, toRoman } from "@/lib/faktur";
import type { FakturFormValues } from "@/lib/schemas/faktur";
import { DocumentPage } from "@/components/shared/document/document-page";
import { DocumentLetterhead } from "@/components/shared/document/document-letterhead";

const titleCase = (s: string) => s.replace(/\S+/g, (w) => w.charAt(0).toUpperCase() + w.slice(1));
const tglPanjang = (iso: string) =>
  iso ? new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "—";

export function FakturDocument({
  values,
  noFaktur,
}: {
  values: FakturFormValues;
  noFaktur: string;
}): React.JSX.Element {
  const t = computeFaktur(values);
  const cell = "border border-[var(--doc-rule)] px-2 py-1";
  const sumLabel = `${cell} text-right font-bold`;
  const sumVal = `${cell} text-right font-mono tabular-nums whitespace-nowrap`;

  return (
    <DocumentPage header={<DocumentLetterhead />}>
      <div className="px-8 pt-4 text-sm leading-snug">
        {/* Meta */}
        <div className="flex items-start justify-between gap-6">
          <div>
            <p>Kepada Yth.</p>
            <p>Bapak / Ibu Direktur</p>
            <p className="font-semibold">{values.perusahaanNama || "—"}</p>
            <p>Di {values.kota || "—"}</p>
          </div>
          <div className="shrink-0 text-right">
            {companyProfile.kota}, {tglPanjang(values.tanggal)}
          </div>
        </div>

        {/* Title */}
        <div className="mt-4 text-center">
          <p className="text-lg font-bold tracking-[0.3em]">INVOICE</p>
          <p className="font-semibold">
            TERMIN {toRoman(values.terminIndex + 1)}
            {t.pemicu ? ` (${t.pemicu})` : ""}
          </p>
          <p className="font-mono text-xs">No Inv: {noFaktur}</p>
        </div>

        {/* Table */}
        <table className="mt-3 w-full border-collapse border border-[var(--doc-rule)] text-sm">
          <thead>
            <tr className="bg-[var(--doc-blue-soft)] text-center font-bold">
              <th className={cell}>No.</th>
              <th className={cell}>Uraian</th>
              <th className={cell}>Biaya Satuan (Rp)</th>
              <th className={cell}>Vol</th>
              <th className={cell}>Total (Rp)</th>
            </tr>
          </thead>
          <tbody>
            {values.items.map((it, i) => (
              <tr key={i}>
                <td className={`${cell} text-center`}>{i + 1}</td>
                <td className={cell}>{it.uraian || "—"}</td>
                <td className={`${cell} text-right font-mono tabular-nums`}>{formatRupiah(it.harga)}</td>
                <td className={`${cell} text-center`}>{it.volume}</td>
                <td className={`${cell} text-right font-mono tabular-nums`}>
                  {formatRupiah((Number(it.volume) || 0) * (Number(it.harga) || 0))}
                </td>
              </tr>
            ))}
            {/* two empty filler rows like the PDF */}
            <tr><td className={cell}>&nbsp;</td><td className={cell} /><td className={cell} /><td className={cell} /><td className={cell} /></tr>
            <tr><td className={cell}>&nbsp;</td><td className={cell} /><td className={cell} /><td className={cell} /><td className={cell} /></tr>

            <SummaryRow label="TOTAL BIAYA" value={formatRupiah(t.totalBiaya)} labelCls={sumLabel} valCls={sumVal} />
            {t.previous.map((p, i) => (
              <SummaryRow key={i} label={`${p.label} ${p.persen}%`} value={formatRupiah(-p.amount)} labelCls={sumLabel} valCls={sumVal} />
            ))}
            <SummaryRow label={t.pemicu || "Termin ini"} value={formatRupiah(t.nilaiTermin)} labelCls={sumLabel} valCls={sumVal} />
            {values.ppnAktif && <SummaryRow label="DPP" value={formatRupiah(t.dpp)} labelCls={sumLabel} valCls={sumVal} />}
            {values.ppnAktif && <SummaryRow label="PPN" value={formatRupiah(t.ppn)} labelCls={sumLabel} valCls={sumVal} />}
            {values.pph23Aktif && <SummaryRow label="PPh" value={formatRupiah(-t.pph23)} labelCls={sumLabel} valCls={`${sumVal} text-destructive`} />}
            <SummaryRow label="TOTAL BIAYA SETELAH PAJAK" value={formatRupiah(t.total)} labelCls={sumLabel} valCls={`${sumVal} font-bold`} />
            <tr>
              <td colSpan={5} className={`${cell} text-center`}>
                <span className="font-semibold">Terbilang: </span>
                <span className="font-bold italic">{titleCase(terbilang(t.total))} Rupiah</span>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Catatan / bank */}
        <div className="mt-3">
          <p className="font-bold">Catatan:</p>
          <p>Pembayaran dapat dilakukan melalui</p>
          <div className="grid grid-cols-[auto_auto_1fr] gap-x-2">
            <span>Bank</span><span>:</span><span>{companyProfile.bank.nama}</span>
            <span>Atas Nama</span><span>:</span><span>{companyProfile.bank.atasNama}</span>
            <span>Nomor Rekening</span><span>:</span><span className="font-mono">{companyProfile.bank.noRekening}</span>
          </div>
          {values.catatan.filter((c) => c.trim()).length > 0 && (
            <ul className="mt-1 list-disc pl-5">
              {values.catatan.filter((c) => c.trim()).map((c, i) => <li key={i}>{c}</li>)}
            </ul>
          )}
          <p className="mt-2 font-bold">Invoice ini berlaku sebagai kwitansi</p>
        </div>

        {/* Signature */}
        <div className="mt-5 flex flex-col items-end text-right">
          <p>Hormat Kami,</p>
          <div className="h-10" />
          <p className="font-bold underline">{companyProfile.direktur.nama}</p>
          <p className="font-bold">{companyProfile.direktur.jabatan}</p>
        </div>
      </div>
    </DocumentPage>
  );
}

function SummaryRow({ label, value, labelCls, valCls }: { label: string; value: string; labelCls: string; valCls: string }) {
  return (
    <tr>
      <td className={labelCls} colSpan={4}>{label}</td>
      <td className={valCls}>{value}</td>
    </tr>
  );
}
