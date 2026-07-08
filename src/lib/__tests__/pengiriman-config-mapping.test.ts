import { describe, it, expect } from "vitest";
import {
  toEmailAkun,
  toTemplatesByChannel,
  type EmailAccountRow,
  type MessageTemplateRow,
} from "@/lib/pengiriman-config/mapping";

describe("toEmailAkun", () => {
  it("returns null when not configured", () => {
    const row: EmailAccountRow = {
      host: null, port: null, username: null, fromNama: null, fromEmail: null, isConfigured: false,
    };
    expect(toEmailAkun(row)).toBeNull();
  });

  it("returns null when the row is missing entirely", () => {
    expect(toEmailAkun(undefined)).toBeNull();
  });

  it("never includes a password field, even if one were present on the row", () => {
    const row = {
      host: "smtp.gmail.com", port: 587, username: "sales@sbmj.co.id",
      fromNama: "SBMJ", fromEmail: "noreply@sbmj.co.id", isConfigured: true,
      passwordEncrypted: "should-never-leak",
    } as EmailAccountRow & { passwordEncrypted: string };
    const dto = toEmailAkun(row);
    expect(dto).not.toBeNull();
    expect(dto).not.toHaveProperty("password");
    expect(dto).not.toHaveProperty("passwordEncrypted");
    expect(dto?.terkonfigurasi).toBe(true);
  });
});

describe("toTemplatesByChannel", () => {
  const rows: MessageTemplateRow[] = [
    { channel: "email", documentType: "sph", subject: "Penawaran {no_sph}", body: "email sph body" },
    { channel: "email", documentType: "invoice", subject: "Invoice {no_inv}", body: "email invoice body" },
    { channel: "email", documentType: "slip_gaji", subject: "Slip {periode}", body: "email slip body" },
    { channel: "whatsapp", documentType: "sph", subject: null, body: "wa sph body" },
    { channel: "whatsapp", documentType: "invoice", subject: null, body: "wa invoice body" },
    { channel: "whatsapp", documentType: "slip_gaji", subject: null, body: "wa slip body" },
  ];

  it("groups only the requested channel's rows, translating document type", () => {
    const email = toTemplatesByChannel(rows, "email");
    expect(email.sph.body).toBe("email sph body");
    expect(email.faktur.body).toBe("email invoice body");
    expect(email.slip.body).toBe("email slip body");
    expect(email.sph.subjek).toBe("Penawaran {no_sph}");
  });

  it("whatsapp templates have no subject", () => {
    const whatsapp = toTemplatesByChannel(rows, "whatsapp");
    expect(whatsapp.sph.subjek).toBeNull();
    expect(whatsapp.sph.body).toBe("wa sph body");
  });
});
