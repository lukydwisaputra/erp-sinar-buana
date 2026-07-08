import { DOC_TYPE_APP_TO_DB, DOC_TYPE_DB_TO_APP, type AppDocType } from "@/lib/pengiriman/enum-map";
import type { PengirimanLog, JenisDokumenKirim } from "@/lib/schemas/pengiriman";

export type DeliveryRow = {
  id: string;
  channel: "email" | "whatsapp";
  documentType: "sph" | "invoice" | "slip_gaji";
  quotationId: string | null;
  installmentInvoiceId: string | null;
  payslipId: string | null;
  documentNumber: string;
  recipientName: string;
  recipientContact: string;
  status: "queued" | "sent" | "failed";
  error: string | null;
  sentAt: Date | null;
  createdAt: Date;
};

/** Which nullable owner FK column a given jenisDokumen writes into. */
export function resolveOwnerColumn(
  jenis: JenisDokumenKirim,
): "quotationId" | "installmentInvoiceId" | "payslipId" {
  if (jenis === "sph") return "quotationId";
  if (jenis === "faktur") return "installmentInvoiceId";
  return "payslipId";
}

/** Builds the single owner-FK field to insert, keyed by jenisDokumen. */
export function ownerFields(
  jenis: JenisDokumenKirim,
  dokumenId: string,
): { quotationId: string } | { installmentInvoiceId: string } | { payslipId: string } {
  const column = resolveOwnerColumn(jenis);
  return { [column]: dokumenId } as
    | { quotationId: string }
    | { installmentInvoiceId: string }
    | { payslipId: string };
}

export function toDbDocType(jenis: JenisDokumenKirim) {
  return DOC_TYPE_APP_TO_DB[jenis as AppDocType];
}

export function toPengirimanLog(row: DeliveryRow): PengirimanLog {
  const dokumenId = row.quotationId ?? row.installmentInvoiceId ?? row.payslipId ?? "";
  return {
    id: row.id,
    jenisDokumen: DOC_TYPE_DB_TO_APP[row.documentType],
    dokumenId,
    dokumenNomor: row.documentNumber,
    tujuanNama: row.recipientName,
    tujuanKontak: row.recipientContact,
    channel: row.channel,
    timestamp: (row.sentAt ?? row.createdAt).toISOString(),
    status: row.status,
    error: row.error,
  };
}
