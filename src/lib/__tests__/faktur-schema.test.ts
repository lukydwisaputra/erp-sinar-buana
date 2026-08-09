import { describe, it, expect } from "vitest";
import { updateTerminSchema } from "@/lib/schemas/faktur";

describe("updateTerminSchema", () => {
  it("accepts and preserves a tanggal field", () => {
    const parsed = updateTerminSchema.parse({
      tanggal: "2026-07-01",
      jatuhTempo: "2026-07-15",
      bankAccountId: "bank-1",
      catatan: "koreksi tanggal",
    });
    expect(parsed.tanggal).toBe("2026-07-01");
  });

  it("still accepts a payload with tanggal omitted", () => {
    const parsed = updateTerminSchema.parse({ statusId: "status-1" });
    expect(parsed.tanggal).toBeUndefined();
  });
});
