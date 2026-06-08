import { companyProfile } from "@/lib/company-profile";
import { formatRupiah } from "@/lib/format";
import {
  rabGrandTotal,
  rabLangsungTotal,
  rabPersonilTotal,
  rabRowTotal,
  rabTemplate,
  type RabRow,
} from "@/lib/sph-templates";

/** Compact SBMJ letterhead strip shared by the RAB / Jadwal pages. */
function LetterheadStrip(): React.JSX.Element {
  return (
    <div className="flex items-center gap-3 border-b border-[var(--sph-rule)] px-8 py-3">
      <div className="flex size-10 items-center justify-center rounded-full border-2 border-[var(--sph-blue)] text-[var(--sph-blue)]">
        <span className="text-[11px] font-bold tracking-tight">SBMJ</span>
      </div>
      <div>
        <p className="text-xs font-bold text-[var(--sph-blue)]">{companyProfile.nama}</p>
        <p className="text-[10px] tracking-wide text-[var(--sph-blue-2)]">{companyProfile.tagline}</p>
      </div>
    </div>
  );
}

/** One body row of a RAB table. */
function RabRowCells({ no, row }: { no: number; row: RabRow }): React.JSX.Element {
  return (
    <tr>
      <td className="border border-[var(--sph-rule)] px-2 py-1 text-center">{no}</td>
      <td className="border border-[var(--sph-rule)] px-2 py-1">{row.uraian}</td>
      <td className="border border-[var(--sph-rule)] px-2 py-1 text-center">{row.vol}</td>
      <td className="border border-[var(--sph-rule)] px-2 py-1 text-right font-mono tabular-nums">
        {formatRupiah(row.hargaSatuan)}
      </td>
      <td className="border border-[var(--sph-rule)] px-2 py-1 text-right font-mono tabular-nums">
        {formatRupiah(rabRowTotal(row))}
      </td>
    </tr>
  );
}

export function SphRabPage({ serviceName }: { serviceName: string }): React.JSX.Element {
  const personilTotal = rabPersonilTotal(rabTemplate);
  const langsungTotal = rabLangsungTotal(rabTemplate);
  const grandTotal = rabGrandTotal(rabTemplate);

  return (
    <div className="sph-doc mx-auto w-full max-w-[210mm] bg-white text-[var(--sph-ink)] shadow-sm">
      <LetterheadStrip />

      <div className="px-8 py-6 text-sm">
        {/* Title */}
        <div className="text-center font-bold leading-snug">
          <p>RINCIAN ANGGARAN BIAYA</p>
          <p>PENGURUSAN {serviceName.toUpperCase()}</p>
        </div>

        {/* A. Rincian Biaya Personil */}
        <p className="mt-6 font-bold">A. Rincian Biaya Personil</p>
        <table className="mt-2 w-full border-collapse border border-[var(--sph-rule)] text-sm">
          <thead>
            <tr className="bg-[var(--sph-blue-soft)] text-center font-bold">
              <th className="border border-[var(--sph-rule)] px-2 py-1">No</th>
              <th className="border border-[var(--sph-rule)] px-2 py-1">Uraian</th>
              <th className="border border-[var(--sph-rule)] px-2 py-1">Vol (Bln)</th>
              <th className="border border-[var(--sph-rule)] px-2 py-1">Harga Satuan (Rp)</th>
              <th className="border border-[var(--sph-rule)] px-2 py-1">Jumlah Harga (Rp)</th>
            </tr>
          </thead>
          <tbody>
            {rabTemplate.personil.map((row, i) => (
              <RabRowCells key={i} no={i + 1} row={row} />
            ))}
            <tr>
              <td colSpan={4} className="border border-[var(--sph-rule)] px-2 py-1 text-right font-bold">
                Jumlah A
              </td>
              <td className="border border-[var(--sph-rule)] px-2 py-1 text-right font-mono font-bold tabular-nums">
                {formatRupiah(personilTotal)}
              </td>
            </tr>
          </tbody>
        </table>

        {/* B. Rincian Biaya Langsung */}
        <p className="mt-6 font-bold">B. Rincian Biaya Langsung</p>
        <table className="mt-2 w-full border-collapse border border-[var(--sph-rule)] text-sm">
          <thead>
            <tr className="bg-[var(--sph-blue-soft)] text-center font-bold">
              <th className="border border-[var(--sph-rule)] px-2 py-1">No</th>
              <th className="border border-[var(--sph-rule)] px-2 py-1">Uraian</th>
              <th className="border border-[var(--sph-rule)] px-2 py-1">Volume (Ls)</th>
              <th className="border border-[var(--sph-rule)] px-2 py-1">Harga Satuan (Rp)</th>
              <th className="border border-[var(--sph-rule)] px-2 py-1">Jumlah Harga (Rp)</th>
            </tr>
          </thead>
          <tbody>
            {rabTemplate.langsung.map((row, i) => (
              <RabRowCells key={i} no={i + 1} row={row} />
            ))}
            <tr>
              <td colSpan={4} className="border border-[var(--sph-rule)] px-2 py-1 text-right font-bold">
                Jumlah B
              </td>
              <td className="border border-[var(--sph-rule)] px-2 py-1 text-right font-mono font-bold tabular-nums">
                {formatRupiah(langsungTotal)}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Total */}
        <table className="mt-6 w-full max-w-md border-collapse border border-[var(--sph-rule)] text-sm">
          <tbody>
            <tr>
              <td className="border border-[var(--sph-rule)] px-2 py-1">Biaya Personil</td>
              <td className="border border-[var(--sph-rule)] px-2 py-1 text-right font-mono tabular-nums">
                {formatRupiah(personilTotal)}
              </td>
            </tr>
            <tr>
              <td className="border border-[var(--sph-rule)] px-2 py-1">Biaya Langsung</td>
              <td className="border border-[var(--sph-rule)] px-2 py-1 text-right font-mono tabular-nums">
                {formatRupiah(langsungTotal)}
              </td>
            </tr>
            <tr className="bg-[var(--sph-blue-soft)]">
              <td className="border border-[var(--sph-rule)] px-2 py-1 font-bold">TOTAL BIAYA</td>
              <td className="border border-[var(--sph-rule)] px-2 py-1 text-right font-mono font-bold tabular-nums">
                {formatRupiah(grandTotal)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
