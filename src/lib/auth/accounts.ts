import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { withServiceRole } from "@/lib/db/tx";
import { schema } from "@/lib/db/client";
import { ConflictError } from "@/lib/api-error";
import type { AppRole } from "./rbac";

export class DuplicateEmailError extends ConflictError {
  constructor() {
    super("Email sudah terdaftar.");
    this.name = "DuplicateEmailError";
  }
}

export class DuplicateEmployeeLinkError extends ConflictError {
  constructor() {
    super("Karyawan ini sudah memiliki akun.");
    this.name = "DuplicateEmployeeLinkError";
  }
}

export type Account = {
  id: string;
  email: string | null;
  fullName: string;
  role: AppRole;
  employeeId: string | null;
  isActive: boolean;
  hasPasswordSet: boolean;
};

const accountColumns = {
  id: schema.userProfiles.id,
  email: schema.authUsers.email,
  fullName: schema.userProfiles.fullName,
  role: schema.userProfiles.role,
  employeeId: schema.userProfiles.employeeId,
  isActive: schema.userProfiles.isActive,
  passwordHash: schema.userProfiles.passwordHash,
};

type AccountRow = {
  id: string;
  email: string | null;
  fullName: string;
  role: AppRole;
  employeeId: string | null;
  isActive: boolean;
  passwordHash: string | null;
};

function toAccount(row: AccountRow): Account {
  const { passwordHash, ...rest } = row;
  return { ...rest, hasPasswordSet: passwordHash != null };
}

export async function listAccounts(): Promise<Account[]> {
  return withServiceRole(async (tx) => {
    const rows = await tx
      .select(accountColumns)
      .from(schema.userProfiles)
      .innerJoin(schema.authUsers, eq(schema.userProfiles.id, schema.authUsers.id));
    return rows.map(toAccount);
  });
}

export async function getAccountByEmail(email: string): Promise<Account | null> {
  return withServiceRole(async (tx) => {
    const [row] = await tx
      .select(accountColumns)
      .from(schema.authUsers)
      .innerJoin(schema.userProfiles, eq(schema.userProfiles.id, schema.authUsers.id))
      .where(eq(schema.authUsers.email, email))
      .limit(1);
    return row ? toAccount(row) : null;
  });
}

/** Login-only lookup — includes the password hash, unlike `Account`. */
export async function getCredentialsByEmail(
  email: string,
): Promise<{ id: string; isActive: boolean; passwordHash: string | null } | null> {
  return withServiceRole(async (tx) => {
    const [row] = await tx
      .select({
        id: schema.userProfiles.id,
        isActive: schema.userProfiles.isActive,
        passwordHash: schema.userProfiles.passwordHash,
      })
      .from(schema.authUsers)
      .innerJoin(schema.userProfiles, eq(schema.userProfiles.id, schema.authUsers.id))
      .where(eq(schema.authUsers.email, email))
      .limit(1);
    return row ?? null;
  });
}

export async function getAccountById(id: string): Promise<Account | null> {
  return withServiceRole(async (tx) => {
    const [row] = await tx
      .select(accountColumns)
      .from(schema.userProfiles)
      .innerJoin(schema.authUsers, eq(schema.userProfiles.id, schema.authUsers.id))
      .where(eq(schema.userProfiles.id, id))
      .limit(1);
    return row ? toAccount(row) : null;
  });
}

/** FR-01.1 — Admin creates an account (Menunggu Aktivasi until invite is accepted). */
export async function createAccount(input: {
  fullName: string;
  email: string;
  role: AppRole;
  employeeId: string | null;
}): Promise<Account> {
  return withServiceRole(async (tx) => {
    const [emailTaken] = await tx
      .select({ id: schema.authUsers.id })
      .from(schema.authUsers)
      .where(eq(schema.authUsers.email, input.email))
      .limit(1);
    if (emailTaken) throw new DuplicateEmailError();

    if (input.employeeId) {
      const [employeeTaken] = await tx
        .select({ id: schema.userProfiles.id })
        .from(schema.userProfiles)
        .where(eq(schema.userProfiles.employeeId, input.employeeId))
        .limit(1);
      if (employeeTaken) throw new DuplicateEmployeeLinkError();
    }

    const id = randomUUID();
    await tx.insert(schema.authUsers).values({ id, email: input.email });
    await tx.insert(schema.userProfiles).values({
      id,
      fullName: input.fullName,
      role: input.role,
      employeeId: input.employeeId,
      isActive: true,
    });

    return {
      id,
      email: input.email,
      fullName: input.fullName,
      role: input.role,
      employeeId: input.employeeId,
      isActive: true,
      hasPasswordSet: false,
    };
  });
}

export async function updateAccount(
  id: string,
  input: { role?: AppRole; employeeId?: string | null },
): Promise<void> {
  await withServiceRole(async (tx) => {
    if (input.employeeId) {
      const [employeeTaken] = await tx
        .select({ id: schema.userProfiles.id })
        .from(schema.userProfiles)
        .where(eq(schema.userProfiles.employeeId, input.employeeId))
        .limit(1);
      if (employeeTaken && employeeTaken.id !== id) throw new DuplicateEmployeeLinkError();
    }
    await tx.update(schema.userProfiles).set(input).where(eq(schema.userProfiles.id, id));
  });
}

/** US-01.5 — deactivate/reactivate (never hard-delete, BR-13). */
export async function setAccountActive(id: string, isActive: boolean): Promise<void> {
  await withServiceRole(async (tx) => {
    await tx.update(schema.userProfiles).set({ isActive }).where(eq(schema.userProfiles.id, id));
  });
}

export async function setPasswordHash(id: string, passwordHash: string): Promise<void> {
  await withServiceRole(async (tx) => {
    await tx.update(schema.userProfiles).set({ passwordHash }).where(eq(schema.userProfiles.id, id));
  });
}
