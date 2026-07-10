import { companyProfileCache } from "@/lib/company-profile/cache";
import { formatRupiah, formatTanggalPanjang as tglPanjang, titleCase } from "@/lib/format";
import { terbilang } from "@/lib/terbilang";
import type { FakturInduk, InvoiceTermin } from "@/lib/schemas/faktur";
import { DocumentPage } from "@/components/shared/document/document-page";
import { DocumentLetterhead } from "@/components/shared/document/document-letterhead";

/** Printable Invoice Termin document. Faktur Induk no longer stores per-item
 * volume/harga (that lived on the SPH; the DB's normalized model just lists
 * service names on `master_invoice_services`) — the itemized "Baris Tagihan"
 * table from the old mock is replaced by a plain service list, with the
 * total sourced from the Faktur Induk's stored `totalBiaya`. */
export function FakturDocument({ induk, termin }: { induk: FakturInduk; termin: InvoiceTermin }): React.JSX.Element {
  const companyProfile = companyProfileCache.current;
  const cell = "border border-[var(--doc-rule)] px-2 py-1";
  const sumLabel = `${cell} text-right font-bold`;
  const sumVal = `${cell} text-right font-mono tabular-nums whitespace-nowrap`;

  return (
    <DocumentPage header={<DocumentLetterhead />}>
      <div className="px-8 text-[11px] leading-snug">
        {/* Meta */}
        <div className="flex items-start justify-between gap-6">
          <div>
            <p>Kepada Yth.</p>
            <p className="font-semibold">{induk.perusahaanNama || "—"}</p>
            <p>Di Tempat</p>
          </div>
          <div className="shrink-0 text-right">
            {companyProfile.kota}, {tglPanjang(termin.tanggal)}
          </div>
        </div>

        {/* Title */}
        <div className="mt-4 text-center">
          <p className="text-lg font-bold tracking-[0.3em]">INVOICE</p>
          <p className="font-semibold">{termin.label}</p>
          <p className="font-mono">No Inv: {termin.number ?? "—"}</p>
        </div>

        {/* Table */}
        <table className="mt-3 w-full border-collapse border border-[var(--doc-rule)]">
          <thead>
            <tr className="bg-[var(--doc-blue-soft)] text-center font-bold">
              <th className={cell}>No.</th>
              <th className={cell}>Layanan</th>
            </tr>
          </thead>
          <tbody>
            {induk.layanan.map((l, i) => (
              <tr key={l.serviceId ?? i}>
                <td className={`${cell} text-center`}>{i + 1}</td>
                <td className={cell}>{l.nama}</td>
              </tr>
            ))}

            <SummaryRow label="TOTAL BIAYA" value={formatRupiah(induk.totalBiaya)} labelCls={sumLabel} valCls={sumVal} colSpan={1} />
            <SummaryRow label={termin.label} value={formatRupiah(termin.nilaiTermin)} labelCls={sumLabel} valCls={sumVal} colSpan={1} />
            {termin.ppn > 0 && <SummaryRow label="DPP" value={formatRupiah(termin.dpp)} labelCls={sumLabel} valCls={sumVal} colSpan={1} />}
            {termin.ppn > 0 && <SummaryRow label="PPN" value={formatRupiah(termin.ppn)} labelCls={sumLabel} valCls={sumVal} colSpan={1} />}
            {termin.pph23 > 0 && <SummaryRow label="PPh" value={formatRupiah(-termin.pph23)} labelCls={sumLabel} valCls={`${sumVal} text-destructive`} colSpan={1} />}
            <SummaryRow label="TOTAL BIAYA SETELAH PAJAK" value={formatRupiah(termin.totalSetelahPajak)} labelCls={sumLabel} valCls={`${sumVal} font-bold`} colSpan={1} />
            <tr>
              <td colSpan={2} className={`${cell} text-center`}>
                <span className="font-semibold">Terbilang: </span>
                <span className="font-bold italic">{titleCase(terbilang(termin.totalSetelahPajak))} Rupiah</span>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Catatan / bank */}
        <div className="mt-3 text-[9px]">
          <p className="font-bold">Catatan:</p>
          <p>Pembayaran dapat dilakukan melalui</p>
          <div className="grid grid-cols-[auto_auto_1fr] gap-x-2">
            <span>Bank</span><span>:</span><span>{termin.bankNama || companyProfile.bank.nama}</span>
            <span>Atas Nama</span><span>:</span><span>{termin.bankAtasNama || companyProfile.bank.atasNama}</span>
            <span>Nomor Rekening</span><span>:</span><span className="font-mono">{termin.bankNoRekening || companyProfile.bank.noRekening}</span>
          </div>
          <ul className="mt-1 list-disc pl-5">
            {termin.previousTermins.map((p, i) => (
              <li key={i}>{p.label}: {formatRupiah(p.nilai)} (Sudah dibayar)</li>
            ))}
            {termin.catatan && <li>{termin.catatan}</li>}
          </ul>
          <p className="mt-2 font-bold">Invoice ini berlaku sebagai kwitansi</p>
        </div>

        {/* Signature */}
        <div className="mt-5 flex flex-col items-end text-right">
          <p>Hormat Kami,</p>
          <div className="h-20" />
          <p className="font-bold underline">{companyProfile.direktur.nama}</p>
          <p className="font-bold">{companyProfile.direktur.jabatan}</p>
        </div>
      </div>
    </DocumentPage>
  );
}

function SummaryRow({ label, value, labelCls, valCls }: { label: string; value: string; labelCls: string; valCls: string; colSpan: number }) {
  return (
    <tr>
      <td className={labelCls} colSpan={1}>{label}</td>
      <td className={valCls}>{value}</td>
    </tr>
  );
}
