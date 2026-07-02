import { describe, it, expect } from "vitest";
import { listPengirimanLog, createPengirimanLog } from "@/lib/data/pengiriman";

describe("listPengirimanLog", () => {
  it("returns seeded log rows sorted newest-first", async () => {
    const rows = await listPengirimanLog();
    expect(rows.length).toBeGreaterThanOrEqual(4);
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i - 1].timestamp >= rows[i].timestamp).toBe(true);
    }
  });

  it("includes at least one entry per document type", async () => {
    const rows = await listPengirimanLog();
    expect(rows.some((r) => r.jenisDokumen === "sph")).toBe(true);
    expect(rows.some((r) => r.jenisDokumen === "faktur")).toBe(true);
    expect(rows.some((r) => r.jenisDokumen === "slip")).toBe(true);
  });
});

describe("createPengirimanLog", () => {
  it("appends a new row with a generated id and timestamp", async () => {
    const before = await listPengirimanLog();
    const created = await createPengirimanLog({
      jenisDokumen: "sph",
      dokumenId: "SPH/999/1.2026",
      dokumenNomor: "SPH/999/1.2026",
      tujuanNama: "Andi Wijaya",
      tujuanKontak: "6281211002201",
      channel: "whatsapp",
    });
    expect(created.id).toBeTruthy();
    expect(created.timestamp).toBeTruthy();

    const after = await listPengirimanLog();
    expect(after.length).toBe(before.length + 1);
    expect(after.some((r) => r.id === created.id)).toBe(true);
  });
});
