/**
 * One-off dev utility: creates one test account per AppRole (admin, keuangan,
 * sales, tim_teknis, viewer) so the RBAC matrix can be exercised end-to-end
 * by just switching login. Mirrors seed-admin.ts's direct-SQL bootstrap
 * approach (standalone, no `@/` imports, runs with plain `node`).
 *
 * Run: node --env-file=.env.local scripts/seed-role-test-accounts.ts
 */
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { hash } from "@node-rs/argon2";

const PASSWORD = "TestRole123!";

type Account = {
  role: "admin" | "keuangan" | "sales" | "tim_teknis" | "viewer";
  email: string;
  fullName: string;
  clientCompanyName?: string; // viewer only — links to an existing company for RLS scoping
};

const ACCOUNTS: Account[] = [
  { role: "admin", email: "test-admin@sbmj.local", fullName: "Test Admin" },
  { role: "keuangan", email: "test-keuangan@sbmj.local", fullName: "Test Keuangan" },
  { role: "sales", email: "test-sales@sbmj.local", fullName: "Test Sales" },
  { role: "tim_teknis", email: "test-timteknis@sbmj.local", fullName: "Test Tim Teknis" },
  { role: "viewer", email: "test-viewer@sbmj.local", fullName: "Test Viewer (Klien)", clientCompanyName: "PT Maju Bersama Industri" },
];

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL must be set (see .env.local).");

  const sql = postgres(databaseUrl);
  try {
    const passwordHash = await hash(PASSWORD);

    for (const acc of ACCOUNTS) {
      const [existing] = await sql`select id from auth.users where email = ${acc.email}`;
      if (existing) {
        console.log(`[skip] ${acc.role}: ${acc.email} already exists (id=${existing.id})`);
        continue;
      }

      const id = randomUUID();
      const linkedCompanyId: string | null = await sql.begin(async (tx) => {
        // RLS applies to this connection's own role — service_role is needed
        // for the companies lookup too, not just the insert.
        await tx`set local role service_role`;

        let clientCompanyId: string | null = null;
        if (acc.clientCompanyName) {
          const [company] = await tx`select id from public.companies where name = ${acc.clientCompanyName} and deleted_at is null limit 1`;
          if (!company) throw new Error(`Company "${acc.clientCompanyName}" not found — pick a real seeded company name.`);
          clientCompanyId = company.id;
        }

        await tx`insert into auth.users (id, email) values (${id}, ${acc.email})`;
        await tx`
          insert into public.user_profiles (id, full_name, password_hash, role, client_company_id, is_active)
          values (${id}, ${acc.fullName}, ${passwordHash}, ${acc.role}, ${clientCompanyId}, true)
        `;
        return clientCompanyId;
      });

      console.log(`[created] ${acc.role}: ${acc.email} (id=${id})${linkedCompanyId ? ` — linked to ${acc.clientCompanyName}` : ""}`);
    }

    console.log(`\nAll accounts use password: ${PASSWORD}`);
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
