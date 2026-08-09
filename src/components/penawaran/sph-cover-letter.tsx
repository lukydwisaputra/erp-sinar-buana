import { companyProfileCache } from "@/lib/company-profile/cache";
import { pdfTemplateNotesCache } from "@/lib/pdf-templates/cache";
import { formatRupiah, formatTanggalPanjang as tglPanjang, titleCase } from "@/lib/format";
import { terbilang } from "@/lib/terbilang";
import { totalPenawaran } from "@/lib/sph";
import { taxBreakdown } from "@/lib/faktur";
import type { SphFormValues } from "@/lib/schemas/penawaran";
import { SALUTATION_LABEL } from "@/lib/schemas/common";
import { DocumentPage } from "@/components/shared/document/document-page";
import { DocumentLetterhead } from "@/components/shared/document/document-letterhead";

export function SphCoverLetter({
  values,
  noSph,
  signatureImage,
}: {
  values: SphFormValues;
  noSph: string;
  /** Resolved digital-signature image (data URI) — null/absent leaves the
   * existing blank-space-for-manual-signature treatment untouched. */
  signatureImage?: string | null;
}): React.JSX.Element {
  const companyProfile = companyProfileCache.current;
  const { headerNote, footerNote } = pdfTemplateNotesCache.current.sph;
  const total = totalPenawaran(values.items);
  const tax = taxBreakdown(total, values.ppnAktif, values.ppnPersen, values.pph23Aktif, values.pph23Persen);
  const taxActive = values.ppnAktif || values.pph23Aktif;
  const totalSetelahPajak = taxActive ? tax.net : total;

  // Lampiran line: the typed "Dokumen pendukung" plus the RAB & Estimasi Waktu
  // appendix (only when the toggle is on), joined by ", ". Empty → long dash.
  const lampiranText =
    [values.lampiran.trim(), values.rincianAktif ? "RAB dan Estimasi Waktu" : ""]
      .filter(Boolean)
      .join(", ") || "—";

  return (
    <DocumentPage header={<DocumentLetterhead />}>
      {/* Body -------------------------------------------------------------- */}
      <div className="px-8 text-[11px] leading-relaxed">
        {/* 2. Letter meta */}
        <div className="flex items-start justify-between gap-6">
          <div className="grid grid-cols-[auto_auto_1fr] gap-x-2">
            <span>No</span>
            <span>:</span>
            <span className="font-mono">{noSph}</span>
            <span>Perihal</span>
            <span>:</span>
            <span>Surat Penawaran Harga</span>
            <span>Lampiran</span>
            <span>:</span>
            <span>{lampiranText}</span>
          </div>
          <div className="shrink-0 text-right">
            <div>
              {companyProfile.kota}, {tglPanjang(values.tanggal)}
            </div>
          </div>
        </div>

        {/* 3. Kepada */}
        <div className="mt-6">
          <p>Kepada Yth.</p>
          <p>{SALUTATION_LABEL[values.salutasiPenerima]} {values.jabatanPenerima || "Direktur"}</p>
          <p className="font-semibold">{values.perusahaanNama || "—"}</p>
          {values.picAktif && values.picNama && (
            <p>u.p. {SALUTATION_LABEL[values.picSalutation]} {values.picNama}</p>
          )}
          <p>Di {values.tempat || "Tempat"}</p>
        </div>

        {/* Header note — Konfigurasi > Template > PDF, admin-configured per
            documentType, distinct from the per-SPH `kalimatPembuka` below. */}
        {headerNote && <p className="mt-4 text-justify whitespace-pre-line">{headerNote}</p>}

        {/* 4. Pembuka */}
        <p className="mt-6">Dengan Hormat,</p>
        <p className="mt-2 text-justify indent-8">{values.kalimatPembuka}</p>

        {/* 5. Service table */}
        <table className="mt-4 w-full border-collapse border border-(--doc-rule)">
          <thead>
            <tr className="bg-(--doc-blue-soft) text-center font-bold">
              <th className="border border-(--doc-rule) px-2 py-1">No</th>
              <th className="border border-(--doc-rule) px-2 py-1">Uraian</th>
              <th className="border border-(--doc-rule) px-2 py-1">Biaya Satuan (Rp)</th>
              <th className="border border-(--doc-rule) px-2 py-1">Volume</th>
              <th className="border border-(--doc-rule) px-2 py-1">Total (Rp)</th>
            </tr>
          </thead>
          <tbody>
            {values.items.length === 0 ? (
              <tr>
                <td colSpan={5} className="border border-(--doc-rule) px-2 py-4 text-center">
                  Tambahkan layanan…
                </td>
              </tr>
            ) : (
              values.items.map((it, i) => (
                <tr key={i}>
                  <td className="border border-(--doc-rule) px-2 py-1 text-center">{i + 1}</td>
                  <td className="border border-(--doc-rule) px-2 py-1">{it.nama || "—"}</td>
                  <td className="border border-(--doc-rule) px-2 py-1 text-right font-mono tabular-nums">
                    {formatRupiah(it.harga)}
                  </td>
                  <td className="border border-(--doc-rule) px-2 py-1 text-center">
                    {it.volume} {it.satuan}
                  </td>
                  <td className="border border-(--doc-rule) px-2 py-1 text-right font-mono tabular-nums">
                    {formatRupiah((Number(it.volume) || 0) * (Number(it.harga) || 0))}
                  </td>
                </tr>
              ))
            )}
            {/* Total Biaya */}
            <tr>
              <td
                colSpan={4}
                className="border border-(--doc-rule) px-2 py-1 text-right font-bold"
              >
                TOTAL BIAYA
              </td>
              <td className="border border-(--doc-rule) px-2 py-1 text-right font-mono font-bold tabular-nums">
                {formatRupiah(total)}
              </td>
            </tr>
            {/* DPP/PPN/PPh breakdown (only when a tax is active) */}
            {taxActive && (
              <>
                {values.ppnAktif && (
                  <tr>
                    <td colSpan={4} className="border border-(--doc-rule) px-2 py-1 text-right">DPP</td>
                    <td className="border border-(--doc-rule) px-2 py-1 text-right font-mono tabular-nums">
                      {formatRupiah(tax.dpp)}
                    </td>
                  </tr>
                )}
                {tax.ppn > 0 && (
                  <tr>
                    <td colSpan={4} className="border border-(--doc-rule) px-2 py-1 text-right">PPN</td>
                    <td className="border border-(--doc-rule) px-2 py-1 text-right font-mono tabular-nums">
                      {formatRupiah(tax.ppn)}
                    </td>
                  </tr>
                )}
                {tax.pph23 > 0 && (
                  <tr>
                    <td colSpan={4} className="border border-(--doc-rule) px-2 py-1 text-right">PPh</td>
                    <td className="border border-(--doc-rule) px-2 py-1 text-right font-mono tabular-nums text-destructive">
                      {formatRupiah(-tax.pph23)}
                    </td>
                  </tr>
                )}
                <tr>
                  <td
                    colSpan={4}
                    className="border border-(--doc-rule) px-2 py-1 text-right font-bold"
                  >
                    TOTAL BIAYA SETELAH PAJAK
                  </td>
                  <td className="border border-(--doc-rule) px-2 py-1 text-right font-mono font-bold tabular-nums">
                    {formatRupiah(totalSetelahPajak)}
                  </td>
                </tr>
              </>
            )}
            {/* Terbilang */}
            <tr>
              <td colSpan={5} className="border border-(--doc-rule) px-2 py-1 text-center">
                <span className="font-semibold">Terbilang: </span>
                <span className="font-bold italic">{titleCase(terbilang(totalSetelahPajak))} Rupiah</span>
              </td>
            </tr>
          </tbody>
        </table>

        {/* 6. Catatan */}
        <div className="mt-4 text-[9px]">
          <p className="font-bold">Catatan:</p>
          <ul className="list-disc pl-5">
            {values.masaBerlakuAktif && (
              <li>Penawaran harga berlaku {values.masaBerlakuHari} hari kalender</li>
            )}
            {values.catatan
              .filter((c) => c.trim())
              .map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            {values.termin.length > 0 && (
              <li>
                Termin pembayaran di bagi menjadi {values.termin.length} tahap:
                <ol className="list-decimal pl-5">
                  {values.termin.map((t, i) => (
                    <li key={i}>
                      {t.persen}% {t.pemicu || "—"}
                    </li>
                  ))}
                </ol>
              </li>
            )}
          </ul>
        </div>

        {/* Footer note — Konfigurasi > Template > PDF. */}
        {footerNote && <p className="mt-3 text-[9px] whitespace-pre-line">{footerNote}</p>}

        {/* 7. Penutup */}
        <p className="mt-4 indent-8 text-justify">
          Demikian penawaran harga tersebut kami sampaikan atas perhatian dan kerjasama kami ucapkan
          terimakasih.
        </p>

        {/* 8. Signature */}
        <div className="mt-8 flex flex-col items-end text-right">
          <p>Hormat Kami,</p>
          {signatureImage ? (
            // Fixed-width invisible bounds so the hand-drawn ink visually
            // centers under "Hormat Kami," regardless of where it sits
            // within its own (mostly transparent) source canvas image —
            // the stamp/logo below doesn't need this, it's already symmetric.
            <div className="my-2 flex w-40 justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={signatureImage} alt="Tanda tangan" className="h-20 w-auto" />
            </div>
          ) : companyProfile.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={companyProfile.logo} alt="Cap perusahaan" className="my-2 size-20 object-contain opacity-50" />
          ) : (
            // Approximates the round company stamp — blank space for a manual signature + wet stamp.
            <div className="my-2 flex size-20 rotate-[-8deg] items-center justify-center rounded-full border-2 border-(--doc-blue)/60 text-(--doc-blue)/70">
              <span className="text-base font-bold tracking-tight">SBMJ</span>
            </div>
          )}
          <p className="font-bold underline">{companyProfile.direktur.nama}</p>
          <p className="font-bold">{companyProfile.direktur.jabatan}</p>
        </div>
      </div>
    </DocumentPage>
  );
}
