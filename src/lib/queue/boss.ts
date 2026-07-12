import { PgBoss } from "pg-boss";
import { env } from "@/env";
import { reportError } from "@/lib/observability/sentry";

export const DELIVERY_EMAIL_QUEUE = "pengiriman.email";
export const PASSWORD_RESET_EMAIL_QUEUE = "auth.password-reset";

let bossPromise: Promise<PgBoss> | null = null;

/**
 * Lazy-started, module-level pg-boss singleton — safe under this app's
 * already-persistent Node runtime (same assumption src/lib/db/client.ts makes
 * for the Postgres pool). Manages its own `pgboss` schema, separate from
 * `public`, so it never conflicts with Drizzle's migration tracking.
 */
export async function getBoss(): Promise<PgBoss> {
  if (!bossPromise) {
    bossPromise = (async () => {
      const boss = new PgBoss(env.DATABASE_URL);
      boss.on("error", (err: Error) => reportError(err, { source: "pg-boss" }));
      await boss.start();
      await boss.createQueue(DELIVERY_EMAIL_QUEUE);
      await boss.createQueue(PASSWORD_RESET_EMAIL_QUEUE);
      return boss;
    })();
  }
  return bossPromise;
}
