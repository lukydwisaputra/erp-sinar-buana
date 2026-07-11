/**
 * One-time bootstrap: creates the first Admin account directly (password
 * already set, no invite needed) so there's an Admin able to invite everyone
 * else. Chicken-and-egg fix for EP-01 — normally Admin creates all accounts.
 *
 * Standalone by design (no `@/` imports) so it runs with plain `node`
 * (Node 26 strips TS types natively) without needing a bundler to resolve
 * path aliases. Run: node --env-file=.env.local scripts/seed-admin.ts
 */
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { hash } from "@node-rs/argon2";

// The literal default from .env.example — fine for local dev, never for a
// real database. Set NODE_ENV=production in whatever runs this against a
// production DB (same convention src/lib/auth/cookie.ts already relies on)
// to have this actually enforced instead of just warned about.
const PLACEHOLDER_PASSWORDS = new Set(["change-me-admin"]);
const MIN_PRODUCTION_PASSWORD_LENGTH = 12;

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  const fullName = process.env.SEED_ADMIN_NAME ?? "Admin";

  if (!databaseUrl || !email || !password) {
    throw new Error(
      "DATABASE_URL, SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set (see .env.example).",
    );
  }

  if (process.env.NODE_ENV === "production") {
    if (PLACEHOLDER_PASSWORDS.has(password)) {
      throw new Error(
        "SEED_ADMIN_PASSWORD is still the placeholder value from .env.example — refusing to create an admin with a known credential in production. Set a real password first.",
      );
    }
    if (password.length < MIN_PRODUCTION_PASSWORD_LENGTH) {
      throw new Error(`SEED_ADMIN_PASSWORD must be at least ${MIN_PRODUCTION_PASSWORD_LENGTH} characters in production.`);
    }
  } else if (PLACEHOLDER_PASSWORDS.has(password)) {
    console.warn(
      "WARNING: SEED_ADMIN_PASSWORD is the placeholder value from .env.example. Fine for local dev — change it before running this against any real/production database.",
    );
  }

  const sql = postgres(databaseUrl);
  try {
    const [existing] = await sql`select id from auth.users where email = ${email}`;
    if (existing) {
      console.log(`Admin ${email} already exists (id=${existing.id}) — nothing to do.`);
      return;
    }

    const id = randomUUID();
    const passwordHash = await hash(password);

    await sql.begin(async (tx) => {
      // BYPASSRLS only takes effect for the *current* role — inherited via
      // plain membership isn't enough — and there's no admin session to
      // adopt yet for this one-time bootstrap insert (chicken-and-egg).
      await tx`set local role service_role`;
      await tx`insert into auth.users (id, email) values (${id}, ${email})`;
      await tx`
        insert into public.user_profiles (id, full_name, password_hash, role, is_active)
        values (${id}, ${fullName}, ${passwordHash}, 'admin', true)
      `;
    });

    console.log(`Admin account created: ${email} (id=${id}). You can log in now.`);
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
