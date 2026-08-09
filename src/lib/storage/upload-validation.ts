/** Shared upload constraints — one source of truth for every upload route
 * (currently just company-logo; future document-attachment routes reuse
 * this instead of redefining their own allowlist/size cap).
 *
 * Validated by extension, not `file.type`: browsers report inconsistent
 * MIME types for Office formats across OS/browser combos (e.g. .csv shows
 * up as text/csv, application/vnd.ms-excel, or application/octet-stream
 * depending on the browser), so the client-reported type isn't a reliable
 * gate — only used as storage metadata (ContentType), not for validation.
 */
export const ALLOWED_UPLOAD_EXTENSIONS = [
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".csv",
  ".jpg",
  ".jpeg",
  ".png",
  ".pdf",
] as const;

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB

export function getExtension(fileName: string): string {
  const i = fileName.lastIndexOf(".");
  return i === -1 ? "" : fileName.slice(i).toLowerCase();
}

/** Returns a user-facing error message, or null if the file is valid. */
export function validateUpload(file: { name: string; size: number }): string | null {
  const ext = getExtension(file.name);
  if (!ALLOWED_UPLOAD_EXTENSIONS.includes(ext as (typeof ALLOWED_UPLOAD_EXTENSIONS)[number])) {
    return `Format tidak didukung. Gunakan salah satu: ${ALLOWED_UPLOAD_EXTENSIONS.join(", ")}.`;
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return "Ukuran berkas maksimal 10MB.";
  }
  return null;
}
