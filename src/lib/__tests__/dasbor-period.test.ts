import { describe, it, expect } from "vitest";
import { dalamPeriode } from "@/lib/dasbor/period";

const juni: { mulai: string; selesai: string } = { mulai: "2026-06-01", selesai: "2026-06-30" };

describe("dalamPeriode", () => {
  it("includes the boundary dates (inclusive)", () => {
    expect(dalamPeriode("2026-06-01", juni)).toBe(true);
    expect(dalamPeriode("2026-06-30", juni)).toBe(true);
  });

  it("excludes dates outside the range", () => {
    expect(dalamPeriode("2026-05-31", juni)).toBe(false);
    expect(dalamPeriode("2026-07-01", juni)).toBe(false);
  });

  it("treats empty string as not a member", () => {
    expect(dalamPeriode("", juni)).toBe(false);
  });
});
