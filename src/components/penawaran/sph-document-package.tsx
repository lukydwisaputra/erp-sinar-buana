import { SphCoverLetter } from "@/components/penawaran/sph-cover-letter";
import { SphRabPage } from "@/components/penawaran/sph-rab-page";
import { SphJadwalPage } from "@/components/penawaran/sph-jadwal-page";
import type { SphFormValues } from "@/lib/schemas/penawaran";

/** Full internal SPH package: cover letter (client-facing) + per-service RAB + schedule pages. */
export function SphDocumentPackage({ values, noSph }: { values: SphFormValues; noSph: string }) {
  // The toggle is the SOLE control: when on, every line item gets its RAB +
  // Estimasi Waktu appendix page (even an unnamed/empty one, so the user sees
  // and fills the template); when off, none are emitted.
  const appendix = values.rincianAktif ? values.items : [];
  return (
    <div className="space-y-8">
      <SphCoverLetter values={values} noSph={noSph} />
      {appendix.map((it, i) => <SphRabPage key={`rab-${i}`} serviceName={it.nama} rab={it.rab} />)}
      {appendix.map((it, i) => <SphJadwalPage key={`jad-${i}`} serviceName={it.nama} jadwal={it.jadwal} />)}
    </div>
  );
}
