import { cn } from "@/lib/utils";
import { DocumentPage } from "@/components/shared/document/document-page";
import { DocumentLetterhead } from "@/components/shared/document/document-letterhead";

/** Max months shown on a single Estimasi Jadwal sheet; the rest continue on new pages. */
const MAX_MONTHS_PER_PAGE = 6;

/** One sheet of the schedule matrix for a chunk of months (same activity rows, different months). */
function JadwalSheet({
  serviceName,
  kegiatan,
  highlights,
  startMonth,
  endMonth,
  pageInfo,
}: {
  serviceName: string;
  kegiatan: string[];
  highlights: number[][];
  startMonth: number;
  endMonth: number;
  pageInfo?: { page: number; total: number };
}): React.JSX.Element {
  const months: number[] = [];
  for (let m = startMonth; m <= endMonth; m++) months.push(m);
  // Global week numbers (1-based, continuous across all months) for this chunk.
  const weeks: number[] = [];
  for (const m of months) for (let w = 1; w <= 4; w++) weeks.push((m - 1) * 4 + w);

  return (
    <DocumentPage header={<DocumentLetterhead variant="strip" />}>
      <div className="px-8 py-6 text-sm">
        <div className="text-center font-bold leading-snug">
          <p>ESTIMASI JADWAL RENCANA KEGIATAN</p>
          <p>{serviceName.toUpperCase()}</p>
          {pageInfo && (
            <p className="text-xs font-normal text-[var(--doc-blue-2)]">
              Halaman {pageInfo.page} dari {pageInfo.total} — Bulan {startMonth}
              {endMonth > startMonth ? `–${endMonth}` : ""}
            </p>
          )}
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full border-collapse border border-[var(--doc-rule)] text-xs">
            <thead className="bg-[var(--doc-blue-soft)] text-center font-bold">
              <tr>
                <th rowSpan={3} className="border border-[var(--doc-rule)] px-2 py-1">NO</th>
                <th rowSpan={3} className="border border-[var(--doc-rule)] px-2 py-1">KEGIATAN</th>
                {months.map((m) => (
                  <th key={m} colSpan={4} className="border border-[var(--doc-rule)] px-2 py-1">
                    BULAN - {m}
                  </th>
                ))}
              </tr>
              <tr>
                {months.map((m) => (
                  <th key={m} colSpan={4} className="border border-[var(--doc-rule)] px-2 py-1">
                    MINGGU
                  </th>
                ))}
              </tr>
              <tr>
                {weeks.map((week) => (
                  <th key={week} className="w-6 border border-[var(--doc-rule)] px-1 py-1 text-center">
                    {((week - 1) % 4) + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {kegiatan.map((nama, rowIndex) => {
                const shaded = highlights[rowIndex] ?? [];
                return (
                  <tr key={rowIndex}>
                    <td className="border border-[var(--doc-rule)] px-2 py-1 text-center">{rowIndex + 1}</td>
                    <td className="border border-[var(--doc-rule)] px-2 py-1">{nama}</td>
                    {weeks.map((week) => (
                      <td
                        key={week}
                        className={cn(
                          "w-6 border border-[var(--doc-rule)] px-1 py-1 text-center",
                          shaded.includes(week) && "bg-primary/25",
                        )}
                      />
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </DocumentPage>
  );
}

export function SphJadwalPage({
  serviceName,
  jadwal,
}: {
  serviceName: string;
  jadwal: { kegiatan: string[]; highlights: number[][]; bulan: number };
}): React.JSX.Element {
  const { kegiatan, highlights, bulan } = jadwal;
  const pageCount = Math.max(1, Math.ceil(bulan / MAX_MONTHS_PER_PAGE));

  return (
    <>
      {Array.from({ length: pageCount }, (_, p) => {
        const startMonth = p * MAX_MONTHS_PER_PAGE + 1;
        const endMonth = Math.min(bulan || 1, startMonth + MAX_MONTHS_PER_PAGE - 1);
        return (
          <JadwalSheet
            key={p}
            serviceName={serviceName}
            kegiatan={kegiatan}
            highlights={highlights}
            startMonth={startMonth}
            endMonth={endMonth}
            pageInfo={pageCount > 1 ? { page: p + 1, total: pageCount } : undefined}
          />
        );
      })}
    </>
  );
}
