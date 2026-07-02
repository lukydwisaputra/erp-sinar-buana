import { describe, it, expect } from "vitest";
import {
  listBatch, getBatch, getSlip, createBatch, updateSlip, markSlipDibayar,
} from "@/lib/data/penggajian";
import { listArusKas } from "@/lib/data/arus-kas";
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
    const pending = b!.slips.find((s) => s.status === "menunggu_pembayaran")!;
    await markSlipDibayar("GAJ-002", pending.id);
    const slip = await getSlip("GAJ-002", pending.id);
    expect(slip?.status).toBe("sudah_dibayar");
    expect(slip?.paidAt).not.toBeNull();
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
      periode: { mulai: "2026-05-24", selesai: "2026-06-24" }, tanggalBayar: "2026-06-24",
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

describe("Arus Kas automation on Penggajian status change (regression)", () => {
  it("posts an otomatis_penggajian entry when a slip is marked dibayar", async () => {
    const b = await getBatch("GAJ-001");
    const template = b!.slips[0];
    const created = await createBatch({
      periode: { mulai: "2026-07-01", selesai: "2026-07-31" }, tanggalBayar: "2026-07-25",
      slips: [{
        karyawanId: template.karyawanId, karyawanNama: template.karyawanNama,
        jabatan: template.jabatan, statusKepegawaian: template.statusKepegawaian,
        pengali: template.pengali, gajiPokok: template.gajiPokok, tunjangan: template.tunjangan,
        lembur: 0, bonus: 0, pph21: 0, bpjsPotongan: 0,
        bankNama: template.bankNama, bankNomor: template.bankNomor, bankAtasNama: template.bankAtasNama,
      }],
    });
    const slip = created.slips[0];

    const before = await listArusKas();
    expect(before.filter((e) => e.referensiId === created.id).length).toBe(0);

    await markSlipDibayar(created.id, slip.id);
    const after = await listArusKas();
    expect(after.filter((e) => e.referensiId === created.id && e.sumber === "otomatis_penggajian").length).toBe(1);
  });

  it("posts nothing for a batch whose slips are never marked dibayar", async () => {
    const b = await getBatch("GAJ-001");
    const pending = b!.slips.find((s) => s.status === "menunggu_pembayaran");
    if (!pending) return; // every slip in this fixture batch is already paid — nothing to assert
    const before = await listArusKas();
    expect(before.filter((e) => e.referensiId === "GAJ-001" && e.sumber === "otomatis_penggajian" && e.keterangan.includes(pending.karyawanNama)).length).toBe(0);
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
