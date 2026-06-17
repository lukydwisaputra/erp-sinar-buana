import { describe, it, expect } from "vitest";
import {
  listBatch, getBatch, getSlip, createBatch, updateSlip, markSlipDibayar,
  listArusKasLog,
} from "@/lib/data/penggajian";
import { calcSlip } from "@/lib/schemas/penggajian";

describe("listBatch", () => {
  it("returns all seeded batches", async () => {
    const rows = await listBatch();
    expect(rows.length).toBeGreaterThanOrEqual(2);
    expect(rows[0]).toMatchObject({ id: expect.any(String), slips: expect.any(Array) });
  });
});

describe("getBatch", () => {
  it("returns batch with embedded slips", async () => {
    const b = await getBatch("GAJ-001");
    expect(b?.id).toBe("GAJ-001");
    expect(b!.slips.length).toBeGreaterThanOrEqual(1);
  });
  it("returns null for unknown id", async () => {
    expect(await getBatch("NOPE")).toBeNull();
  });
});

describe("getSlip", () => {
  it("returns correct slip", async () => {
    const b = await getBatch("GAJ-001");
    const slipId = b!.slips[0].id;
    const slip = await getSlip("GAJ-001", slipId);
    expect(slip?.id).toBe(slipId);
    expect(slip?.batchId).toBe("GAJ-001");
  });
  it("returns null for unknown slip", async () => {
    expect(await getSlip("GAJ-001", "NOPE")).toBeNull();
  });
});

describe("updateSlip", () => {
  it("patches editable fields", async () => {
    const b = await getBatch("GAJ-001");
    const pending = b!.slips.find((s) => s.status === "menunggu_pembayaran")!;
    await updateSlip("GAJ-001", pending.id, { lembur: 500_000, bonus: 200_000 });
    const updated = await getSlip("GAJ-001", pending.id);
    expect(updated?.lembur).toBe(500_000);
    expect(updated?.bonus).toBe(200_000);
  });
  it("throws if slip is sudah_dibayar", async () => {
    const b = await getBatch("GAJ-001");
    const paid = b!.slips.find((s) => s.status === "sudah_dibayar")!;
    await expect(updateSlip("GAJ-001", paid.id, { lembur: 1 })).rejects.toThrow();
  });
});

describe("markSlipDibayar", () => {
  it("sets status to sudah_dibayar and sets paidAt", async () => {
    const b = await getBatch("GAJ-002");
    const slipId = b!.slips[0].id;
    await markSlipDibayar("GAJ-002", slipId);
    const slip = await getSlip("GAJ-002", slipId);
    expect(slip?.status).toBe("sudah_dibayar");
    expect(slip?.paidAt).not.toBeNull();
  });
  it("appends an arus kas log entry", async () => {
    const b = await getBatch("GAJ-002");
    const slipId = b!.slips[1].id;
    await markSlipDibayar("GAJ-002", slipId);
    const log = await listArusKasLog();
    expect(log.some((e) => e.slipId === slipId)).toBe(true);
    expect(log.find((e) => e.slipId === slipId)?.kategori).toBe("penggajian");
  });
  it("throws if slip is already sudah_dibayar", async () => {
    const b = await getBatch("GAJ-001");
    const paid = b!.slips.find((s) => s.status === "sudah_dibayar")!;
    await expect(markSlipDibayar("GAJ-001", paid.id)).rejects.toThrow();
  });
});

describe("createBatch", () => {
  it("creates a batch with generated id and slips as menunggu_pembayaran", async () => {
    const b = await getBatch("GAJ-001");
    const slip = b!.slips[0];
    const result = await createBatch({
      periode: { mulai: "2026-05-24", selesai: "2026-06-24" },
      slips: [{
        karyawanId: slip.karyawanId,
        karyawanNama: slip.karyawanNama,
        jabatan: slip.jabatan,
        statusKepegawaian: slip.statusKepegawaian,
        pengali: slip.pengali,
        gajiPokok: slip.gajiPokok,
        tunjangan: slip.tunjangan,
        lembur: 0,
        bonus: 0,
        pph21: 0,
        bpjsPotongan: 0,
        bankNama: slip.bankNama,
        bankNomor: slip.bankNomor,
        bankAtasNama: slip.bankAtasNama,
      }],
    });
    expect(result.id).toMatch(/^GAJ-/);
    expect(result.slips[0].status).toBe("menunggu_pembayaran");
    expect(result.slips[0].paidAt).toBeNull();
  });
});

describe("calcSlip", () => {
  it("calculates correctly for probation (pengali 0.8)", () => {
    const { gajiPokokEfektif, penggajianKotor, penggajianBersih } = calcSlip({
      gajiPokok: 6_500_000, pengali: 0.8,
      tunjangan: 800_000, lembur: 0, bonus: 0,
      pph21: 0, bpjsPotongan: 0,
    });
    expect(gajiPokokEfektif).toBe(5_200_000);
    expect(penggajianKotor).toBe(6_000_000);
    expect(penggajianBersih).toBe(6_000_000);
  });
  it("pph21=0 is valid — bersih equals kotor", () => {
    const { penggajianBersih } = calcSlip({
      gajiPokok: 5_000_000, pengali: 1,
      tunjangan: 0, lembur: 0, bonus: 0,
      pph21: 0, bpjsPotongan: 0,
    });
    expect(penggajianBersih).toBe(5_000_000);
  });
  it("accounts for lembur and bonus in kotor", () => {
    const { penggajianKotor } = calcSlip({
      gajiPokok: 10_000_000, pengali: 1,
      tunjangan: 1_000_000, lembur: 500_000, bonus: 250_000,
      pph21: 0, bpjsPotongan: 0,
    });
    expect(penggajianKotor).toBe(11_750_000);
  });
});
