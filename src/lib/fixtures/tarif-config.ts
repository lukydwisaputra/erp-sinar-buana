import type { TarifConfig } from "@/lib/schemas/tarif-config";

/** Every default here reproduces an existing hardcoded literal exactly
 * (sph-builder.tsx's emptyValues, karyawan.ts's probation pengali) —
 * no behavior change on first load. */
export const tarifConfigFixture: { current: TarifConfig } = {
  current: {
    ppnPersenDefault: 12,
    pph23PersenDefault: 2,
    statusPkp: true,
    jatuhTempoFakturHari: 30,
    jatuhTempoPpnHari: 30,
    jatuhTempoPphHari: 15,
    jatuhTempoBpjsHari: 10,
    masaBerlakuPenawaranHariDefault: 30,
    pengaliProbationDefault: 0.8,
  },
};
