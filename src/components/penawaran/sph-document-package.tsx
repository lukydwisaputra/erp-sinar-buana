import { SphCoverLetter } from "@/components/penawaran/sph-cover-letter";
import { SphRabPage } from "@/components/penawaran/sph-rab-page";
import { SphJadwalPage } from "@/components/penawaran/sph-jadwal-page";
import type { SphFormValues } from "@/lib/schemas/penawaran";

/** Full internal SPH package: cover letter (client-facing) + per-service RAB + schedule pages. */
export function SphDocumentPackage({ values, noSph }: { values: SphFormValues; noSph: string }) {
  const services = values.items.filter((it) => it.nama.trim().length > 0);
  // Only emit appendix pages when the feature is on AND the section has content,
  // so an unchecked toggle (or an empty RAB/Jadwal) never yields a blank page.
  const rabServices = values.rincianAktif
    ? services.filter((it) => it.rab.personil.length > 0 || it.rab.langsung.length > 0)
    : [];
  const jadwalServices = values.rincianAktif
    ? services.filter((it) => it.jadwal.kegiatan.length > 0)
    : [];
  return (
    <div className="space-y-8">
      <SphCoverLetter values={values} noSph={noSph} />
      {rabServices.map((it, i) => <SphRabPage key={`rab-${i}`} serviceName={it.nama} rab={it.rab} />)}
      {jadwalServices.map((it, i) => <SphJadwalPage key={`jad-${i}`} serviceName={it.nama} jadwal={it.jadwal} />)}
    </div>
  );
}
