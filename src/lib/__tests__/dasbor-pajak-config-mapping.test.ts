import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/db/tx", () => ({
  withUserTransaction: (_userId: string, fn: (tx: unknown) => unknown) => fn(fakeTx),
}));
vi.mock("@/lib/db/client", () => ({
  schema: { taxSettings: { corpTaxMethod: "corp_tax_method", corpTaxRate: "corp_tax_rate", umkmThreshold: "umkm_threshold", singleton: "singleton" } },
}));

let selectResult: unknown[] = [];
let setCalls: Record<string, unknown>[] = [];

const fakeTx = {
  select: () => ({ from: () => ({ limit: async () => selectResult }) }),
  update: () => ({
    set: (values: Record<string, unknown>) => {
      setCalls.push(values);
      return { where: () => ({ returning: async () => selectResult }) };
    },
  }),
};

import { getPajakConfig, updatePajakConfig } from "@/lib/dasbor/pajak-config-service";

describe("pajak-config-service — metode mapping (final_0_5 <-> final_05)", () => {
  it("maps DB final_0_5 to app final_05, using the DB rate as tarifFinalPersen and a fixed default for tarifBadanPersen", async () => {
    selectResult = [{ corpTaxMethod: "final_0_5", corpTaxRate: "0.75", umkmThreshold: "4800000000" }];
    const config = await getPajakConfig("user-1");
    expect(config.metode).toBe("final_05");
    expect(config.tarifFinalPersen).toBe(0.75);
    expect(config.tarifBadanPersen).toBe(22); // fixed default, DB doesn't store the inactive method's rate
    expect(config.ambangOmzet).toBe(4_800_000_000);
  });

  it("maps DB badan_22 to app badan_22, using the DB rate as tarifBadanPersen", async () => {
    selectResult = [{ corpTaxMethod: "badan_22", corpTaxRate: "25", umkmThreshold: "4800000000" }];
    const config = await getPajakConfig("user-1");
    expect(config.metode).toBe("badan_22");
    expect(config.tarifBadanPersen).toBe(25);
    expect(config.tarifFinalPersen).toBe(0.5); // fixed default
  });

  it("updatePajakConfig maps final_05 back to DB's final_0_5 and only sets corp-tax columns", async () => {
    setCalls = [];
    selectResult = [{ corpTaxMethod: "final_0_5", corpTaxRate: "1.2", umkmThreshold: "5000000000" }];
    await updatePajakConfig("user-1", {
      metode: "final_05", tarifFinalPersen: 1.2, tarifBadanPersen: 22, ambangOmzet: 5_000_000_000,
    });
    expect(setCalls).toHaveLength(1);
    const set = setCalls[0];
    expect(set.corpTaxMethod).toBe("final_0_5");
    expect(set.corpTaxRate).toBe("1.2");
    expect(set.umkmThreshold).toBe("5000000000");
    expect(Object.keys(set).sort()).toEqual(["corpTaxMethod", "corpTaxRate", "umkmThreshold"]);
  });

  it("updatePajakConfig maps badan_22 and uses tarifBadanPersen as the persisted rate", async () => {
    setCalls = [];
    selectResult = [{ corpTaxMethod: "badan_22", corpTaxRate: "20", umkmThreshold: "4800000000" }];
    await updatePajakConfig("user-1", {
      metode: "badan_22", tarifFinalPersen: 0.5, tarifBadanPersen: 20, ambangOmzet: 4_800_000_000,
    });
    expect(setCalls[0].corpTaxMethod).toBe("badan_22");
    expect(setCalls[0].corpTaxRate).toBe("20");
  });
});
