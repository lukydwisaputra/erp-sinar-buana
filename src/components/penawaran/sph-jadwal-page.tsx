import { companyProfile } from "@/lib/company-profile";
import { cn } from "@/lib/utils";

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

export function SphJadwalPage({
  serviceName,
  jadwal,
}: {
  serviceName: string;
  jadwal: { kegiatan: string[]; highlights: number[][]; bulan: number };
}): React.JSX.Element {
  const { kegiatan, highlights, bulan } = jadwal;
  const months = Array.from({ length: bulan }, (_, i) => i + 1);
  const weeks = Array.from({ length: bulan * 4 }, (_, i) => i + 1);

  return (
    <div className="sph-doc mx-auto w-full max-w-[210mm] bg-white text-[var(--sph-ink)] shadow-sm">
      <LetterheadStrip />

      <div className="px-8 py-6 text-sm">
        {/* Title */}
        <div className="text-center font-bold leading-snug">
          <p>ESTIMASI JADWAL RENCANA KEGIATAN</p>
          <p>{serviceName.toUpperCase()}</p>
        </div>

        {/* Matrix */}
        <div className="mt-6 overflow-x-auto">
          <table className="w-full border-collapse border border-[var(--sph-rule)] text-xs">
            <thead className="bg-[var(--sph-blue-soft)] text-center font-bold">
              <tr>
                <th rowSpan={3} className="border border-[var(--sph-rule)] px-2 py-1">
                  NO
                </th>
                <th rowSpan={3} className="border border-[var(--sph-rule)] px-2 py-1">
                  KEGIATAN
                </th>
                {months.map((m) => (
                  <th key={m} colSpan={4} className="border border-[var(--sph-rule)] px-2 py-1">
                    BULAN - {m}
                  </th>
                ))}
              </tr>
              <tr>
                {months.map((m) => (
                  <th key={m} colSpan={4} className="border border-[var(--sph-rule)] px-2 py-1">
                    MINGGU
                  </th>
                ))}
              </tr>
              <tr>
                {weeks.map((week) => (
                  <th key={week} className="w-6 border border-[var(--sph-rule)] px-1 py-1 text-center">
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
                    <td className="border border-[var(--sph-rule)] px-2 py-1 text-center">
                      {rowIndex + 1}
                    </td>
                    <td className="border border-[var(--sph-rule)] px-2 py-1">{nama}</td>
                    {weeks.map((week) => {
                      const on = shaded.includes(week);
                      return (
                        <td
                          key={week}
                          className={cn(
                            "w-6 border border-[var(--sph-rule)] px-1 py-1 text-center",
                            on && "bg-primary/25",
                          )}
                        />
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
