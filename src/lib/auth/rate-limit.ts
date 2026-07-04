/**
 * Minimal in-memory throttle for login/reset attempts (EP-01 §7 edge case).
 * Single-process only — acceptable for this internal, small-staff app; swap
 * for a real limiter if the app ever runs multi-instance.
 */
const attempts = new Map<string, number[]>();

export function isRateLimited(key: string, limit = 5, windowMs = 60_000): boolean {
  const now = Date.now();
  const recent = (attempts.get(key) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  attempts.set(key, recent);
  return recent.length > limit;
}
