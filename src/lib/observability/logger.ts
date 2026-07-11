import pino from "pino";

/** Structured logging (docs/architecture.md §8) — shipped as JSON lines so
 * Coolify's log viewer (or anything else reading stdout) can filter/query
 * by level and fields, instead of grepping free-text `console.error` output.
 * Pretty-printed in dev for readability; plain JSON in production. */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  transport:
    process.env.NODE_ENV === "production"
      ? undefined
      : { target: "pino-pretty", options: { colorize: true, translateTime: "HH:MM:ss", ignore: "pid,hostname" } },
});
