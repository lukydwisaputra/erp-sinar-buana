import { delay } from "@/lib/data/_delay";
import { statusDefinisiFixtures } from "@/lib/fixtures/status-definisi";
import {
  statusDefinisiSchema, type StatusDefinisi, type DocTypeStatus, type SystemRole,
} from "@/lib/schemas/status-definisi";

function slugify(label: string): string {
  return label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

export async function listStatusDefinisi(docType: DocTypeStatus): Promise<StatusDefinisi[]> {
  await delay();
  return statusDefinisiSchema.array().parse(
    statusDefinisiFixtures.filter((d) => d.docType === docType).sort((a, b) => a.urutan - b.urutan),
  );
}

/** Hot path — called from automation on every status change. Kept fast, no
 * artificial network delay. */
export async function getStatusRole(docType: DocTypeStatus, statusId: string): Promise<SystemRole | null> {
  const row = statusDefinisiFixtures.find((d) => d.docType === docType && d.id === statusId);
  return row?.role ?? null;
}

export async function isValidStatus(docType: DocTypeStatus, statusId: string): Promise<boolean> {
  return statusDefinisiFixtures.some((d) => d.docType === docType && d.id === statusId && d.aktif);
}

export async function createStatusDefinisi(docType: DocTypeStatus, label: string): Promise<StatusDefinisi> {
  await delay(300);
  const id = slugify(label);
  if (!id) throw new Error("Label wajib diisi.");
  if (statusDefinisiFixtures.some((d) => d.docType === docType && d.id === id))
    throw new Error("Item dengan nama ini sudah ada."); // VR-00.1
  const siblingMax = Math.max(0, ...statusDefinisiFixtures.filter((d) => d.docType === docType).map((d) => d.urutan));
  const entry = statusDefinisiSchema.parse({ id, docType, label, urutan: siblingMax + 1, aktif: true, locked: false, role: null });
  statusDefinisiFixtures.push(entry);
  return entry; // "status berfungsi sebagai status biasa (tidak memicu otomasi)" — US-00.2 scenario 2
}

export async function updateStatusLabel(id: string, docType: DocTypeStatus, label: string): Promise<StatusDefinisi> {
  await delay(300);
  const idx = statusDefinisiFixtures.findIndex((d) => d.id === id && d.docType === docType);
  if (idx === -1) throw new Error(`Status ${id} tidak ditemukan.`);
  statusDefinisiFixtures[idx] = { ...statusDefinisiFixtures[idx], label }; // locked rows: label IS editable, only id/role-slot is fixed
  return statusDefinisiFixtures[idx];
}

/** US-00.2 scenario 3: prevent clearing the last status holding a given role,
 * since automation would then have nowhere to route that role. */
function assertRoleReassignable(docType: DocTypeStatus, excludeId: string, role: SystemRole): void {
  const others = statusDefinisiFixtures.filter((d) => d.docType === docType && d.role === role && d.id !== excludeId);
  if (others.length === 0) {
    throw new Error(`Peran ${role} sedang dipakai otomasi — tetapkan pengganti terlebih dahulu.`);
  }
}

export async function setStatusRole(id: string, docType: DocTypeStatus, role: SystemRole | null): Promise<StatusDefinisi> {
  await delay(300);
  const idx = statusDefinisiFixtures.findIndex((d) => d.id === id && d.docType === docType);
  if (idx === -1) throw new Error(`Status ${id} tidak ditemukan.`);
  const current = statusDefinisiFixtures[idx];
  if (role === null && current.role) assertRoleReassignable(docType, id, current.role);
  statusDefinisiFixtures[idx] = { ...current, role };
  return statusDefinisiFixtures[idx];
}

export async function deleteStatusDefinisi(id: string, docType: DocTypeStatus): Promise<void> {
  await delay(300);
  const row = statusDefinisiFixtures.find((d) => d.id === id && d.docType === docType);
  if (!row) return;
  if (row.locked) throw new Error("Status inti tidak dapat dihapus.");
  if (row.role) assertRoleReassignable(docType, id, row.role);
  const idx = statusDefinisiFixtures.indexOf(row);
  statusDefinisiFixtures.splice(idx, 1);
}
