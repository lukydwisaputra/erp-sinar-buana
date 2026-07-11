/**
 * Pure DB-row <-> app-shape mapping for numbering_settings, kept free of any
 * DB connection import so this stays unit-testable without a live Postgres
 * — see `src/lib/numbering/service.ts` for the actual queries.
 */
import type { NumberingSettings } from "@/lib/schemas/numbering";

export type NumberingSettingsRow = {
  sphFormat: string;
  invFormat: string;
  gajFormat: string;
  pryFormat: string;
  prsFormat: string;
  klgFormat: string;
  fkiFormat: string;
  lynFormat: string;
  kryFormat: string;
  seqPadding: number;
};

export function toNumberingSettings(row: NumberingSettingsRow): NumberingSettings {
  return {
    sphFormat: row.sphFormat,
    invFormat: row.invFormat,
    gajFormat: row.gajFormat,
    pryFormat: row.pryFormat,
    prsFormat: row.prsFormat,
    klgFormat: row.klgFormat,
    fkiFormat: row.fkiFormat,
    lynFormat: row.lynFormat,
    kryFormat: row.kryFormat,
    seqPadding: row.seqPadding,
  };
}
