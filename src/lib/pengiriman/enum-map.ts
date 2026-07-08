/**
 * App ↔ DB enum translation for document type. Pure, zero `@/` imports —
 * shared by the app and the standalone worker script.
 */
export const DOC_TYPE_APP_TO_DB = {
  sph: "sph",
  faktur: "invoice",
  slip: "slip_gaji",
} as const;

export const DOC_TYPE_DB_TO_APP = {
  sph: "sph",
  invoice: "faktur",
  slip_gaji: "slip",
} as const;

export type AppDocType = keyof typeof DOC_TYPE_APP_TO_DB;
export type DbDocType = keyof typeof DOC_TYPE_DB_TO_APP;
