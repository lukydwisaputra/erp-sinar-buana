import { describe, it, expect } from "vitest";
import { requireRole, ForbiddenError, UnauthorizedError } from "@/lib/auth/rbac";
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
