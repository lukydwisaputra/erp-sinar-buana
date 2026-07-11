import * as Sentry from "@sentry/node";
// Relative import, not `@/` — this module must also be importable from the
// standalone worker script (scripts/worker.ts), which only resolves
// relative specifiers (same convention as src/lib/crypto.ts).
import { logger } from "./logger.ts";

/** GlitchTip/Sentry free hosted tier (docs/architecture.md §8) — plain
 * `@sentry/node`, not the full `@sentry/nextjs` SDK. That package's
 * auto-instrumentation (webpack plugins, source-map upload, edge-runtime
 * shims) is real added surface for a single-tenant internal app that just
 * needs "tell someone when something throws" — this covers exactly the two
 * places errors are already caught (API routes via api-error.ts, the worker
 * via its own try/catch) without it. No-ops entirely when SENTRY_DSN is
 * unset, so this is optional in dev and any environment that hasn't set
 * one up yet.
 *
 * Safe to call `reportError` before `initSentry` ever runs explicitly
 * (module-load order isn't guaranteed across the app's many entry points) —
 * `reportError` always calls `initSentry` itself first, and `Sentry.init`
 * is a cheap no-op to call more than once.
 */
let initialized = false;

export function initSentry(): void {
  if (initialized) return;
  initialized = true;
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;
  Sentry.init({ dsn, environment: process.env.NODE_ENV ?? "development" });
}

/** Logs (always) + reports to Sentry (when configured) in one call — the
 * drop-in replacement for a bare `console.error(error)`. */
export function reportError(error: unknown, context?: Record<string, unknown>): void {
  initSentry();
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(error, context ? { extra: context } : undefined);
  }
  logger.error({ err: error, ...context }, error instanceof Error ? error.message : String(error));
}
