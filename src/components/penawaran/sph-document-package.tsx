import { SphCoverLetter } from "@/components/penawaran/sph-cover-letter";
import { SphRabPage } from "@/components/penawaran/sph-rab-page";
import { SphJadwalPage } from "@/components/penawaran/sph-jadwal-page";
import { SphKelengkapanPage } from "@/components/penawaran/sph-kelengkapan-page";
import type { SphFormValues } from "@/lib/schemas/penawaran";

/** Full internal SPH package: cover letter + per-service RAB + schedule + kelengkapan pages. */
export function SphDocumentPackage({ values, noSph }: { values: SphFormValues; noSph: string }) {
  const appendix = values.rincianAktif ? values.items : [];
  return (
    <div className="space-y-8">
      <SphCoverLetter values={values} noSph={noSph} />
      {appendix.map((it, i) => <SphRabPage key={`rab-${i}`} serviceName={it.nama} rab={it.rab} />)}
      {appendix.map((it, i) => <SphJadwalPage key={`jad-${i}`} serviceName={it.nama} jadwal={it.jadwal} />)}
      {(values.kelengkapan ?? []).map((k, i) => <SphKelengkapanPage key={`klg-${i}`} kelengkapan={k} />)}
    </div>
  );
}
