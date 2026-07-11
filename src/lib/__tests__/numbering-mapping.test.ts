import { describe, expect, it } from "vitest";
import { toNumberingSettings } from "@/lib/numbering/mapping";

describe("toNumberingSettings", () => {
  it("passes format strings and padding through unchanged", () => {
    const settings = toNumberingSettings({
      sphFormat: "SPH/{seq}/{month}.{year}",
      invFormat: "INV/{seq}/{month}.{year}",
      gajFormat: "GAJ/{seq}/{month}.{year}",
      pryFormat: "PRY/{seq}",
      prsFormat: "PRS/{seq}",
      klgFormat: "KLG/{seq}",
      fkiFormat: "FKI/{seq}",
      lynFormat: "LYN/{seq}",
      kryFormat: "KRY/{seq}",
      seqPadding: 3,
    });
    expect(settings).toEqual({
      sphFormat: "SPH/{seq}/{month}.{year}",
      invFormat: "INV/{seq}/{month}.{year}",
      gajFormat: "GAJ/{seq}/{month}.{year}",
      pryFormat: "PRY/{seq}",
      prsFormat: "PRS/{seq}",
      klgFormat: "KLG/{seq}",
      fkiFormat: "FKI/{seq}",
      lynFormat: "LYN/{seq}",
      kryFormat: "KRY/{seq}",
      seqPadding: 3,
    });
  });
});
