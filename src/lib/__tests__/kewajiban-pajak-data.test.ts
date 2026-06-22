import { describe, it, expect } from "vitest";
import { listKewajibanPajak, setKewajibanStatus } from "@/lib/data/kewajiban-pajak";

describe("listKewajibanPajak", () => {
  it("returns seeded obligations", async () => {
    const rows = await listKewajibanPajak();
    expect(rows.length).toBeGreaterThanOrEqual(4);
  });

  it("includes an unsettled PPh 23 with bukti potong not yet received", async () => {
    const rows = await listKewajibanPajak();
    const pph23 = rows.find((k) => k.jenis === "pph23");
    expect(pph23).toBeDefined();
    expect(pph23!.buktiPotongDiterima).toBe(false);
  });

  it("includes both overdue and future due dates relative to 2026-06-22", async () => {
    const rows = await listKewajibanPajak();
    expect(rows.some((k) => k.jatuhTempo < "2026-06-22")).toBe(true);
    expect(rows.some((k) => k.jatuhTempo > "2026-06-22")).toBe(true);
  });
});

describe("setKewajibanStatus", () => {
  it("marks an obligation as disetor", async () => {
    const rows = await listKewajibanPajak();
    const target = rows.find((k) => k.status === "belum_setor")!;
    const updated = await setKewajibanStatus(target.id, "disetor");
    expect(updated.status).toBe("disetor");
  });

  it("throws for unknown id", async () => {
    await expect(setKewajibanStatus("KWP-9999", "disetor")).rejects.toThrow("tidak ditemukan");
  });
});
