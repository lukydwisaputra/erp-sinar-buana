/**
 * Pure token-substitution + WhatsApp link helpers. Zero `@/` imports —
 * shared by the app (previews, dialog) and the standalone worker script,
 * which only resolves relative specifiers.
 */

export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  return `62${digits}`;
}

export function buildWaLink(telepon: string, pesan: string): string {
  return `https://wa.me/${normalizePhone(telepon)}?text=${encodeURIComponent(pesan)}`;
}

/** Fills `{token}` placeholders from a flat map. Unmatched placeholders are left as-is. */
export function fillTokens(text: string, tokens: Record<string, string>): string {
  return Object.entries(tokens).reduce(
    (acc, [key, value]) => acc.replaceAll(`{${key}}`, value),
    text,
  );
}
