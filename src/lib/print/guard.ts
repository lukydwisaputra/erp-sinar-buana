import { timingSafeEqual } from "node:crypto";
import { notFound } from "next/navigation";
import { getCompanyProfileForPrint } from "@/lib/company-profile/service";
import { listPdfTemplatesForPrint } from "@/lib/pdf-templates/service";
import { companyProfileCache } from "@/lib/company-profile/cache";
import { pdfTemplateNotesCache, pickActiveNotes } from "@/lib/pdf-templates/cache";

/** `timingSafeEqual` throws on mismatched-length buffers rather than
 * returning false, so length is checked first — a plain `!==` string
 * compare leaks how many leading bytes matched via response timing,
 * meaningful here since these routes sit on the app's public domain. */
function safeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

/**
 * Every `src/app/print/**` page calls this first. These routes render real
 * financial/PII documents (SPH/Faktur/Slip) with no logged-in session —
 * only the worker's headless Playwright instance hits them (see
 * `scripts/worker.ts`) — so a shared secret is the only gate. `notFound()`
 * (not 401/403) on any mismatch so an unauthorized prober can't distinguish
 * "wrong token" from "route doesn't exist".
 *
 * Also seeds the synchronous singleton caches (`companyProfileCache`/
 * `pdfTemplateNotesCache`) these document components read from — normally
 * kept fresh by `app-sidebar.tsx`, which never mounts on this route.
 */
export async function guardPrintRequest(token: string | string[] | undefined): Promise<void> {
  const secret = process.env.INTERNAL_RENDER_SECRET;
  if (!secret || typeof token !== "string" || !safeEquals(token, secret)) notFound();

  const [profile, templates] = await Promise.all([
    getCompanyProfileForPrint(),
    listPdfTemplatesForPrint(),
  ]);
  companyProfileCache.current = profile;
  pdfTemplateNotesCache.current = pickActiveNotes(templates);
}
