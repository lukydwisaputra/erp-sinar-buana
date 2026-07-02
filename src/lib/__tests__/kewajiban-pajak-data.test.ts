import { describe, it, expect } from "vitest";
import {
  listKewajibanPajak,
  createKewajibanPajak,
  setKewajibanStatus,
  setBuktiPotong,
} from "@/lib/data/kewajiban-pajak";

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

describe("createKewajibanPajak", () => {
  it("adds a new obligation with a generated id", async () => {
    const before = await listKewajibanPajak();
    const created = await createKewajibanPajak({
      jenis: "ppn", periode: "2026-08", jumlah: 1_000_000,
      jatuhTempo: "2026-09-15", status: "belum_setor", buktiPotongDiterima: true,
      keterangan: "Uji coba",
    });
    const after = await listKewajibanPajak();
    expect(after.length).toBe(before.length + 1);
    expect(created.id).toMatch(/^KWP-\d{4}$/);
    expect(after.find((k) => k.id === created.id)).toEqual(created);
  });

  it("generates unique ids across multiple creates", async () => {
    const a = await createKewajibanPajak({
      jenis: "pph21", periode: "2026-08", jumlah: 500_000,
      jatuhTempo: "2026-09-10", status: "belum_setor", buktiPotongDiterima: true,
      keterangan: "A",
    });
    const b = await createKewajibanPajak({
      jenis: "pph21", periode: "2026-08", jumlah: 500_000,
      jatuhTempo: "2026-09-10", status: "belum_setor", buktiPotongDiterima: true,
      keterangan: "B",
    });
    expect(a.id).not.toBe(b.id);
  });
});

describe("setBuktiPotong", () => {
  it("marks bukti potong as received", async () => {
    const rows = await listKewajibanPajak();
    const target = rows.find((k) => k.jenis === "pph23")!;
    const updated = await setBuktiPotong(target.id, true);
    expect(updated.buktiPotongDiterima).toBe(true);
  });

  it("marks bukti potong as not received", async () => {
    const rows = await listKewajibanPajak();
    const target = rows.find((k) => k.jenis === "pph23")!;
    const updated = await setBuktiPotong(target.id, false);
    expect(updated.buktiPotongDiterima).toBe(false);
  });

  it("throws for unknown id", async () => {
    await expect(setBuktiPotong("KWP-9999", true)).rejects.toThrow("tidak ditemukan");
  });
});
