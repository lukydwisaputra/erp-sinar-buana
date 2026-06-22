import { describe, it, expect } from "vitest";
import { getPajakConfig, updatePajakConfig } from "@/lib/data/pajak-config";

describe("getPajakConfig", () => {
  it("defaults to PPh Final 0.5% with Rp 4.8B threshold", async () => {
    const cfg = await getPajakConfig();
    expect(cfg.metode).toBe("final_05");
    expect(cfg.tarifFinalPersen).toBe(0.5);
    expect(cfg.ambangOmzet).toBe(4_800_000_000);
  });
});

describe("updatePajakConfig", () => {
  it("switches to PPh Badan 22% and persists", async () => {
    const updated = await updatePajakConfig({
      metode: "badan_22",
      tarifFinalPersen: 0.5,
      tarifBadanPersen: 22,
      ambangOmzet: 4_800_000_000,
    });
    expect(updated.metode).toBe("badan_22");
    const again = await getPajakConfig();
    expect(again.metode).toBe("badan_22");
  });
});
