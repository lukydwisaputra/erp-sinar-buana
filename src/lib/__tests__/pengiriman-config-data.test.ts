import { describe, it, expect } from "vitest";
import { getPengirimanConfig, testEmailConnection, updateEmailAkun, updateEmailTemplate } from "@/lib/data/pengiriman-config";

describe("getPengirimanConfig", () => {
  it("defaults to no email account configured", async () => {
    const config = await getPengirimanConfig();
    expect(config.emailAkun).toBeNull();
  });

  it("has default templates for sph, faktur, and slip", async () => {
    const config = await getPengirimanConfig();
    expect(Object.keys(config.emailTemplates).sort()).toEqual(["faktur", "slip", "sph"]);
  });
});

describe("testEmailConnection", () => {
  it("succeeds with well-formed credentials", async () => {
    const result = await testEmailConnection({
      host: "smtp.test.com", port: 587, username: "a@test.com", password: "x",
      fromNama: "SBMJ", fromEmail: "a@test.com",
    });
    expect(result.ok).toBe(true);
  });

  it("fails with an invalid email", async () => {
    const result = await testEmailConnection({
      host: "smtp.test.com", port: 587, username: "a", password: "x",
      fromNama: "SBMJ", fromEmail: "not-an-email",
    });
    expect(result.ok).toBe(false);
  });
});

describe("updateEmailAkun", () => {
  it("flips terkonfigurasi to true only after a successful test", async () => {
    const updated = await updateEmailAkun({
      host: "smtp.test.com", port: 587, username: "a@test.com", password: "x",
      fromNama: "SBMJ", fromEmail: "a@test.com",
    });
    expect(updated.emailAkun?.terkonfigurasi).toBe(true);
  });

  it("throws and does not persist on invalid credentials", async () => {
    await expect(
      updateEmailAkun({ host: "", port: 587, username: "", password: "", fromNama: "", fromEmail: "not-an-email" }),
    ).rejects.toThrow();
  });
});

describe("updateEmailTemplate", () => {
  it("updates only the targeted jenis, leaving others untouched", async () => {
    const before = await getPengirimanConfig();
    const updated = await updateEmailTemplate("faktur", { subjek: "Custom Subjek", body: "Custom Body" });
    expect(updated.emailTemplates.faktur).toEqual({ subjek: "Custom Subjek", body: "Custom Body" });
    expect(updated.emailTemplates.sph).toEqual(before.emailTemplates.sph);
  });
});
