import { describe, it, expect } from "vitest";
import {
  listStatusDefinisi, getStatusRole, isValidStatus,
  createStatusDefinisi, updateStatusLabel, setStatusRole, deleteStatusDefinisi,
} from "@/lib/data/status-definisi";

describe("seed data", () => {
  it("has all 20 built-in rows with the expected roles", async () => {
    expect((await listStatusDefinisi("penawaran")).length).toBe(5);
    expect((await listStatusDefinisi("proyek")).length).toBe(5);
    expect((await listStatusDefinisi("milestone")).length).toBe(4);
    expect((await listStatusDefinisi("faktur")).length).toBe(4);
    expect((await listStatusDefinisi("penggajian")).length).toBe(2);
    expect(await getStatusRole("faktur", "lunas")).toBe("LUNAS");
    expect(await getStatusRole("penggajian", "sudah_dibayar")).toBe("DIBAYAR");
    expect(await getStatusRole("proyek", "selesai")).toBe("SELESAI");
    expect(await getStatusRole("proyek", "dibatalkan")).toBe("BATAL");
    expect(await getStatusRole("penawaran", "deal")).toBeNull();
  });

  it("returns null role for an unknown status id", async () => {
    expect(await getStatusRole("faktur", "not_a_real_status")).toBeNull();
  });
});

describe("updateStatusLabel", () => {
  it("succeeds on a locked row without touching its id or role", async () => {
    const updated = await updateStatusLabel("lunas", "faktur", "Paid");
    expect(updated.label).toBe("Paid");
    expect(await getStatusRole("faktur", "lunas")).toBe("LUNAS"); // unaffected by relabeling
    await updateStatusLabel("lunas", "faktur", "Lunas"); // restore
  });
});

describe("setStatusRole", () => {
  it("blocks clearing the sole holder of a role", async () => {
    await expect(setStatusRole("lunas", "faktur", null)).rejects.toThrow("otomasi");
  });

  it("allows clearing a role once another status holds it", async () => {
    const custom = await createStatusDefinisi("faktur", "Lunas Sebagian");
    await setStatusRole(custom.id, "faktur", "LUNAS");
    await expect(setStatusRole("lunas", "faktur", null)).resolves.toBeDefined();
    await setStatusRole("lunas", "faktur", "LUNAS"); // restore
    await deleteStatusDefinisi(custom.id, "faktur");
  });
});

describe("createStatusDefinisi", () => {
  it("creates a non-locked, role-less status by default", async () => {
    const created = await createStatusDefinisi("proyek", "Review Klien");
    expect(created).toMatchObject({ locked: false, role: null, id: "review_klien" });
    await deleteStatusDefinisi(created.id, "proyek");
  });

  it("rejects a duplicate id within the same docType", async () => {
    await createStatusDefinisi("proyek", "Duplikat Uji");
    await expect(createStatusDefinisi("proyek", "Duplikat Uji")).rejects.toThrow("sudah ada");
    await deleteStatusDefinisi("duplikat_uji", "proyek");
  });
});

describe("deleteStatusDefinisi", () => {
  it("rejects deleting a locked status", async () => {
    await expect(deleteStatusDefinisi("draft", "faktur")).rejects.toThrow("tidak dapat dihapus");
  });

  it("deletes a non-locked, role-less custom status", async () => {
    const created = await createStatusDefinisi("penawaran", "Uji Hapus");
    await deleteStatusDefinisi(created.id, "penawaran");
    const rows = await listStatusDefinisi("penawaran");
    expect(rows.find((r) => r.id === created.id)).toBeUndefined();
  });
});

describe("isValidStatus", () => {
  it("accepts an active built-in id and rejects an unknown one", async () => {
    expect(await isValidStatus("faktur", "lunas")).toBe(true);
    expect(await isValidStatus("faktur", "not_a_real_status")).toBe(false);
  });
});
