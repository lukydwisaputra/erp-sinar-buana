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
  seqPadding: number;
};

export function toNumberingSettings(row: NumberingSettingsRow): NumberingSettings {
  return {
    sphFormat: row.sphFormat,
    invFormat: row.invFormat,
    gajFormat: row.gajFormat,
    seqPadding: row.seqPadding,
  };
}
