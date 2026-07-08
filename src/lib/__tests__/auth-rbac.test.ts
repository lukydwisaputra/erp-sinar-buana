import { describe, it, expect } from "vitest";
import { requireRole, requireFinance, isFinance, ForbiddenError, UnauthorizedError } from "@/lib/auth/rbac";
import type { AppRole } from "@/lib/schemas/pengguna";
import type { SessionUser } from "@/lib/auth/session";

function makeSession(overrides: Partial<SessionUser> = {}): SessionUser {
  return {
    id: "user-1",
    fullName: "Budi Santoso",
    role: "viewer",
    employeeId: null,
    isActive: true,
    ...overrides,
  };
}

describe("requireRole", () => {
  it("throws UnauthorizedError when there is no session", () => {
    expect(() => requireRole(null, "admin")).toThrow(UnauthorizedError);
  });

  it("throws ForbiddenError when the role isn't allowed", () => {
    const session = makeSession({ role: "sales" });
    expect(() => requireRole(session, "admin", "keuangan")).toThrow(ForbiddenError);
  });

  it("returns the session when the role is allowed", () => {
    const session = makeSession({ role: "admin" });
    expect(requireRole(session, "admin")).toBe(session);
  });

  it("allows any of multiple accepted roles", () => {
    const session = makeSession({ role: "keuangan" });
    expect(requireRole(session, "admin", "keuangan")).toBe(session);
  });
});

describe("isFinance / requireFinance", () => {
  it("returns false for a null session", () => {
    expect(isFinance(null)).toBe(false);
  });

  const truthTable: [AppRole, boolean][] = [
    ["admin", true],
    ["keuangan", true],
    ["sales", false],
    ["tim_teknis", false],
    ["viewer", false],
  ];

  it.each(truthTable)("role=%s -> isFinance=%s", (role, expected) => {
    expect(isFinance(makeSession({ role }))).toBe(expected);
  });

  it("requireFinance throws UnauthorizedError when there is no session", () => {
    expect(() => requireFinance(null)).toThrow(UnauthorizedError);
  });

  it("requireFinance throws ForbiddenError for a non-finance role", () => {
    expect(() => requireFinance(makeSession({ role: "sales" }))).toThrow(ForbiddenError);
  });

  it("requireFinance returns the session for admin/keuangan", () => {
    const session = makeSession({ role: "keuangan" });
    expect(requireFinance(session)).toBe(session);
  });
});
