import type { PajakConfig } from "@/lib/schemas/pajak-config";

/** Mutable singleton holder so updates persist within the session. */
export const pajakConfigFixture: { current: PajakConfig } = {
  current: {
    metode: "final_05",
    tarifFinalPersen: 0.5,
    tarifBadanPersen: 22,
    ambangOmzet: 4_800_000_000,
  },
};
