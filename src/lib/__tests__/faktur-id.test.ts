import { describe, it, expect } from "vitest";
import { sphIdToInvBase, terminFakturId } from "@/lib/faktur-id";

describe("sphIdToInvBase", () => {
  it("extracts sequence and year from SPH/001/5.2026", () => {
    expect(sphIdToInvBase("SPH/001/5.2026")).toBe("INV/001/2026");
  });
  it("handles two-digit month SPH/002/11.2026", () => {
    expect(sphIdToInvBase("SPH/002/11.2026")).toBe("INV/002/2026");
  });
  it("handles sequence SPH/004/6.2026", () => {
    expect(sphIdToInvBase("SPH/004/6.2026")).toBe("INV/004/2026");
  });
});

describe("terminFakturId", () => {
  it("adds -T1 suffix for terminIndex 0", () => {
    expect(terminFakturId("INV/001/2026", 0)).toBe("INV/001/2026-T1");
  });
  it("adds -T3 suffix for terminIndex 2", () => {
    expect(terminFakturId("INV/001/2026", 2)).toBe("INV/001/2026-T3");
  });
});
