import { describe, expect, it } from "vitest";
import { toNumberingSettings } from "@/lib/numbering/mapping";

describe("toNumberingSettings", () => {
  it("passes format strings and padding through unchanged", () => {
    const settings = toNumberingSettings({
      sphFormat: "SPH/{seq}/{month}.{year}",
      invFormat: "INV/{seq}/{month}.{year}",
      gajFormat: "GAJ/{seq}/{month}.{year}",
      seqPadding: 3,
    });
    expect(settings).toEqual({
      sphFormat: "SPH/{seq}/{month}.{year}",
      invFormat: "INV/{seq}/{month}.{year}",
      gajFormat: "GAJ/{seq}/{month}.{year}",
      seqPadding: 3,
    });
  });
});
