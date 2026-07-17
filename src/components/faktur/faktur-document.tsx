import { companyProfileCache } from "@/lib/company-profile/cache";
import { pdfTemplateNotesCache } from "@/lib/pdf-templates/cache";
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
/** "Termin I - 40% (Keterangan)" — persen/pemicu are both optional so this
 * also covers the plain header use (label + pemicu, no persen). */
function terminRowLabel(label: string, persen: number | undefined, pemicu: string | null | undefined): string {
  const withPersen = persen !== undefined ? `${label} - ${persen}%` : label;
  return pemicu ? `${withPersen} (${pemicu})` : withPersen;
}

export function FakturDocument({ induk, termin }: { induk: FakturInduk; termin: InvoiceTermin }): React.JSX.Element {
  const companyProfile = companyProfileCache.current;
  const { headerNote, footerNote } = pdfTemplateNotesCache.current.invoice;
  const cell = "border border-[var(--doc-rule)] px-2 py-1";
  const sumLabel = `${cell} text-right font-bold`;
  const sumVal = `${cell} text-right font-mono tabular-nums whitespace-nowrap`;
  const terminPersen = induk.terminScheme.find((t) => t.label === termin.label)?.persen;

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

        {/* Header note — Konfigurasi > Template > PDF. */}
        {headerNote && <p className="mt-3 text-justify whitespace-pre-line">{headerNote}</p>}

        {/* Title */}
        <div className="mt-4 text-center">
          <p className="text-lg font-bold tracking-[0.3em]">INVOICE</p>
          <p className="font-semibold">{termin.label}{termin.pemicu ? ` (${termin.pemicu})` : ""}</p>
          <p className="font-mono">No Inv: {termin.number ?? "—"}</p>
        </div>

        {/* Table */}
        <table className="mt-3 w-full border-collapse border border-[var(--doc-rule)]">
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
            {induk.layanan.map((l, i) => (
              <tr key={l.serviceId ?? i}>
                <td className={`${cell} text-center`}>{i + 1}</td>
                <td className={cell}>{l.nama}</td>
                <td className={`${cell} text-right font-mono tabular-nums`}>
                  {l.harga !== null ? formatRupiah(l.harga) : "—"}
                </td>
                <td className={`${cell} text-center`}>{l.volume !== null ? `${l.volume} ${l.satuan ?? ""}`.trim() : "—"}</td>
                <td className={`${cell} text-right font-mono tabular-nums`}>
                  {l.harga !== null && l.volume !== null ? formatRupiah(l.harga * l.volume) : "—"}
                </td>
              </tr>
            ))}

            <SummaryRow label="TOTAL BIAYA" value={formatRupiah(induk.totalBiaya)} labelCls={sumLabel} valCls={sumVal} />
            {termin.previousTermins.map((p, i) => {
              const persen = induk.terminScheme.find((t) => t.label === p.label)?.persen;
              return (
                <SummaryRow
                  key={i}
                  label={terminRowLabel(p.label, persen, p.pemicu)}
                  value={formatRupiah(-p.nilai)}
                  labelCls={sumLabel}
                  valCls={sumVal}
                />
              );
            })}
            <SummaryRow label={terminRowLabel(termin.label, terminPersen, termin.pemicu)} value={formatRupiah(termin.nilaiTermin)} labelCls={sumLabel} valCls={sumVal} />
            {termin.ppn > 0 && <SummaryRow label="DPP" value={formatRupiah(termin.dpp)} labelCls={sumLabel} valCls={sumVal} />}
            {termin.ppn > 0 && <SummaryRow label="PPN" value={formatRupiah(termin.ppn)} labelCls={sumLabel} valCls={sumVal} />}
            {termin.pph23 > 0 && <SummaryRow label="PPh" value={formatRupiah(-termin.pph23)} labelCls={sumLabel} valCls={`${sumVal} text-destructive`} />}
            <SummaryRow label="TOTAL BIAYA SETELAH PAJAK" value={formatRupiah(termin.totalSetelahPajak)} labelCls={sumLabel} valCls={`${sumVal} font-bold`} />
            <tr>
              <td colSpan={5} className={`${cell} text-center`}>
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
          {termin.catatan && (
            <ul className="mt-1 list-disc pl-5">
              <li>{termin.catatan}</li>
            </ul>
          )}
          <p className="mt-2 font-bold">Invoice ini berlaku sebagai kwitansi</p>
          {footerNote && <p className="mt-2 whitespace-pre-line">{footerNote}</p>}
        </div>

        {/* Signature */}
        <div className="mt-5 flex flex-col items-end text-right">
          <p>Hormat Kami,</p>
          {induk.signatureImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={induk.signatureImage} alt="Tanda tangan" className="h-20 w-auto" />
          ) : (
            <div className="h-20" />
          )}
          <p className="font-bold underline">{companyProfile.direktur.nama}</p>
          <p className="font-bold">{companyProfile.direktur.jabatan}</p>
        </div>
      </div>
    </DocumentPage>
  );
}

function SummaryRow({ label, value, labelCls, valCls }: { label: string; value: React.ReactNode; labelCls: string; valCls: string }) {
  return (
    <tr>
      <td className={labelCls} colSpan={4}>{label}</td>
      <td className={valCls}>{value}</td>
    </tr>
  );
}
