import { describe, it, expect } from "vitest";
import { getTarifConfig, updateTarifConfig } from "@/lib/data/tarif-config";

describe("getTarifConfig", () => {
  it("defaults match today's hardcoded literals", async () => {
    const config = await getTarifConfig();
    expect(config).toMatchObject({
      ppnPersenDefault: 12,
      pph23PersenDefault: 2,
      statusPkp: true,
      jatuhTempoFakturHari: 30,
      jatuhTempoPpnHari: 30,
      jatuhTempoPphHari: 15,
      jatuhTempoBpjsHari: 10,
      masaBerlakuPenawaranHariDefault: 30,
      pengaliProbationDefault: 0.8,
    });
  });
});

describe("updateTarifConfig", () => {
  it("round-trips a full update", async () => {
    const current = await getTarifConfig();
    const updated = await updateTarifConfig({ ...current, ppnPersenDefault: 11 });
    expect(updated.ppnPersenDefault).toBe(11);
    expect(await getTarifConfig()).toMatchObject({ ppnPersenDefault: 11 });
    await updateTarifConfig({ ...updated, ppnPersenDefault: 12 }); // restore
  });

  it("rejects ppnPersenDefault outside 0-100", async () => {
    const current = await getTarifConfig();
    await expect(updateTarifConfig({ ...current, ppnPersenDefault: 150 })).rejects.toThrow();
  });

  it("rejects negative jatuhTempoFakturHari", async () => {
    const current = await getTarifConfig();
    await expect(updateTarifConfig({ ...current, jatuhTempoFakturHari: -1 })).rejects.toThrow();
  });
});
