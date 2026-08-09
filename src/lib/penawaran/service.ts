import { and, asc, eq, desc, inArray, isNull } from "drizzle-orm";
import { withUserTransaction, withServiceRole, type Tx } from "@/lib/db/tx";
import { schema } from "@/lib/db/client";
import { NotFoundError } from "@/lib/api-error";
import {
  toSph,
  quotationColumnsFromInput,
  STATUS_LABEL_BY_ENUM,
  type ToSphInput,
} from "@/lib/penawaran/mapping";
import { createProyekTx } from "@/lib/proyek/service";
import { createFakturIndukTx, syncFakturIndukFromSph } from "@/lib/faktur/service";
import type { Sph, SphItem, SphStatus, SphKelengkapan, CreatePenawaranInput, UpdatePenawaranInput } from "@/lib/schemas/penawaran";

export { toSph } from "@/lib/penawaran/mapping";

async function loadStatusLabel(tx: Tx, statusId: string | null): Promise<string | null> {
  if (!statusId) return null;
  const [row] = await tx.select({ label: schema.workflowStatuses.label }).from(schema.workflowStatuses).where(eq(schema.workflowStatuses.id, statusId)).limit(1);
  return row?.label ?? null;
}

async function loadStatusIdByLabel(tx: Tx, label: string): Promise<string | null> {
  const [row] = await tx
    .select({ id: schema.workflowStatuses.id })
    .from(schema.workflowStatuses)
    .where(and(eq(schema.workflowStatuses.entity, "penawaran"), eq(schema.workflowStatuses.label, label)))
    .limit(1);
  if (!row) {
    throw new NotFoundError(`Status "${label}" belum tersedia — jalankan seed:penawaran.`);
  }
  return row.id;
}

async function loadCompany(tx: Tx, companyId: string) {
  const [row] = await tx.select({ name: schema.companies.name, address: schema.companies.address }).from(schema.companies).where(eq(schema.companies.id, companyId)).limit(1);
  return row ?? { name: "", address: "" };
}

async function assembleSph(tx: Tx, quotation: typeof schema.quotations.$inferSelect): Promise<Sph> {
  const [items, rabPersonnel, rabDirectCosts, schedules, termScheme, company, statusLabel, kelengkapanAttachments] = await Promise.all([
    tx.select().from(schema.quotationItems).where(eq(schema.quotationItems.quotationId, quotation.id)),
    tx.select().from(schema.quotationRabPersonnel).where(eq(schema.quotationRabPersonnel.quotationId, quotation.id)),
    tx.select().from(schema.quotationRabDirectCosts).where(eq(schema.quotationRabDirectCosts.quotationId, quotation.id)),
    tx.select().from(schema.activitySchedules).where(eq(schema.activitySchedules.quotationId, quotation.id)),
    tx.select().from(schema.quotationTermScheme).where(eq(schema.quotationTermScheme.quotationId, quotation.id)),
    loadCompany(tx, quotation.companyId),
    loadStatusLabel(tx, quotation.statusId),
    tx.select().from(schema.quotationKelengkapan).where(eq(schema.quotationKelengkapan.quotationId, quotation.id)),
  ]);

  const scheduleIds = schedules.map((s) => s.id);
  const scheduleRows = scheduleIds.length
    ? await tx.select().from(schema.activityScheduleRows).where(inArray(schema.activityScheduleRows.scheduleId, scheduleIds))
    : [];
  const rowIds = scheduleRows.map((r) => r.id);
  const markedWeeks = rowIds.length
    ? await tx.select().from(schema.activityScheduleMarkedWeeks).where(inArray(schema.activityScheduleMarkedWeeks.rowId, rowIds))
    : [];

  const kelengkapanParentIds = kelengkapanAttachments.map((k) => k.id);
  const kelengkapanItems = kelengkapanParentIds.length
    ? await tx.select().from(schema.quotationKelengkapanItems).where(inArray(schema.quotationKelengkapanItems.quotationKelengkapanId, kelengkapanParentIds))
    : [];

  const signatureImage = quotation.signatureTemplateId
    ? await tx.select({ signatureImage: schema.signatureTemplates.signatureImage }).from(schema.signatureTemplates).where(eq(schema.signatureTemplates.id, quotation.signatureTemplateId)).limit(1).then((r) => r[0]?.signatureImage ?? null)
    : null;

  const input: ToSphInput = {
    quotation,
    companyName: company.name,
    companyAddress: company.address,
    items,
    rabPersonnel,
    rabDirectCosts,
    schedules,
    scheduleRows,
    markedWeeks,
    termScheme,
    statusLabel,
    kelengkapanAttachments,
    kelengkapanItems,
    signatureImage,
  };
  return toSph(input);
}

function computeLineTotal(item: SphItem): number {
  return item.volume * item.harga;
}

/** Inserts one item's rows (quotation_items + its RAB/Jadwal children). */
async function insertItem(tx: Tx, userId: string, quotationId: string, item: SphItem, sortOrder: number) {
  void userId;
  const [row] = await tx
    .insert(schema.quotationItems)
    .values({
      quotationId,
      serviceId: item.layananId || null,
      description: item.nama,
      unitPrice: String(item.harga),
      quantity: String(item.volume),
      unit: item.satuan || null,
      lineTotal: String(computeLineTotal(item)),
      sortOrder,
    })
    .returning();

  if (item.rab.personil.length) {
    await tx.insert(schema.quotationRabPersonnel).values(
      item.rab.personil.map((r, i) => ({
        quotationId,
        quotationItemId: row.id,
        role: r.uraian,
        volumeMonths: String(r.vol),
        unitPrice: String(r.hargaSatuan),
        amount: String(r.vol * r.hargaSatuan),
        sortOrder: i,
      })),
    );
  }
  if (item.rab.langsung.length) {
    await tx.insert(schema.quotationRabDirectCosts).values(
      item.rab.langsung.map((r, i) => ({
        quotationId,
        quotationItemId: row.id,
        description: r.uraian,
        amount: String(r.vol * r.hargaSatuan),
        sortOrder: i,
      })),
    );
  }

  if (item.jadwal.kegiatan.length) {
    const [schedule] = await tx
      .insert(schema.activitySchedules)
      .values({
        quotationId,
        quotationItemId: row.id,
        numMonths: item.jadwal.bulan,
        weeksPerMonth: 4, // hardcoded everywhere in the app (service-rab-jadwal-editor.tsx: bulan * 4)
      })
      .returning();
    for (const [i, kegiatan] of item.jadwal.kegiatan.entries()) {
      const [scheduleRow] = await tx
        .insert(schema.activityScheduleRows)
        .values({ scheduleId: schedule.id, activityName: kegiatan, sortOrder: i })
        .returning();
      const weeks = item.jadwal.highlights[i] ?? [];
      if (weeks.length) {
        await tx.insert(schema.activityScheduleMarkedWeeks).values(
          weeks.map((weekNumber) => ({ rowId: scheduleRow.id, weekNumber, isActual: 0 })),
        );
      }
    }
  }
}

async function deleteChildren(tx: Tx, quotationId: string) {
  // Schedules must go before items (cascade handles rows/marked_weeks, but the
  // FK from activity_schedules.quotation_item_id also cascades on item delete —
  // deleting the quotation_id-scoped rows explicitly keeps this readable).
  await tx.delete(schema.activitySchedules).where(eq(schema.activitySchedules.quotationId, quotationId));
  await tx.delete(schema.quotationRabPersonnel).where(eq(schema.quotationRabPersonnel.quotationId, quotationId));
  await tx.delete(schema.quotationRabDirectCosts).where(eq(schema.quotationRabDirectCosts.quotationId, quotationId));
  await tx.delete(schema.quotationTermScheme).where(eq(schema.quotationTermScheme.quotationId, quotationId));
  await tx.delete(schema.quotationItems).where(eq(schema.quotationItems.quotationId, quotationId));
}

/** Full replace of the attached Kelengkapan checklists — a SNAPSHOT taken at
 * attach time (items cascade automatically via FK on the parent's delete). */
async function insertKelengkapan(tx: Tx, quotationId: string, kelengkapan: SphKelengkapan[]) {
  for (const [i, attachment] of kelengkapan.entries()) {
    const [parent] = await tx
      .insert(schema.quotationKelengkapan)
      .values({
        quotationId,
        templateId: attachment.templateId || null,
        name: attachment.nama,
        sortOrder: i,
      })
      .returning();
    if (attachment.items.length) {
      await tx.insert(schema.quotationKelengkapanItems).values(
        attachment.items.map((item, j) => ({
          quotationKelengkapanId: parent.id,
          persyaratan: item.persyaratan,
          status: item.status === "" ? null : item.status,
          keterangan: item.keterangan || null,
          sortOrder: j,
        })),
      );
    }
  }
}

export async function listQuotations(userId: string): Promise<Sph[]> {
  return withUserTransaction(userId, async (tx) => {
    const rows = await tx
      .select()
      .from(schema.quotations)
      .where(isNull(schema.quotations.deletedAt))
      .orderBy(desc(schema.quotations.createdAt));
    return Promise.all(rows.map((row) => assembleSph(tx, row)));
  });
}

export async function getQuotation(userId: string, id: string): Promise<Sph> {
  return withUserTransaction(userId, async (tx) => {
    const [row] = await tx
      .select()
      .from(schema.quotations)
      .where(and(eq(schema.quotations.id, id), isNull(schema.quotations.deletedAt)))
      .limit(1);
    if (!row) throw new NotFoundError("Penawaran tidak ditemukan.");
    return assembleSph(tx, row);
  });
}

/** Used only by the internal PDF-render pipeline (`src/app/print/**`, called
 * by the worker via headless browser, not a real user session) — elevated
 * since there's no logged-in user to scope RLS to. Never exposed through a
 * normal API route. */
export async function getQuotationForPrint(id: string): Promise<Sph | null> {
  return withServiceRole(async (tx) => {
    const [row] = await tx
      .select()
      .from(schema.quotations)
      .where(and(eq(schema.quotations.id, id), isNull(schema.quotations.deletedAt)))
      .limit(1);
    if (!row) return null;
    return assembleSph(tx, row);
  });
}

export async function createQuotation(userId: string, input: CreatePenawaranInput): Promise<Sph> {
  return withUserTransaction(userId, async (tx) => {
    const status: SphStatus = input.status ?? "draft";
    const statusId = await loadStatusIdByLabel(tx, STATUS_LABEL_BY_ENUM[status]);
    const totalAmount = input.items.reduce((sum, item) => sum + computeLineTotal(item), 0);

    const [quotation] = await tx
      .insert(schema.quotations)
      .values({
        ...quotationColumnsFromInput(input),
        companyId: input.perusahaanId,
        date: input.tanggal,
        statusId,
        totalAmount: String(totalAmount),
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();

    for (const [i, item] of input.items.entries()) {
      await insertItem(tx, userId, quotation.id, item, i);
    }
    if (input.termin.length) {
      await tx.insert(schema.quotationTermScheme).values(
        input.termin.map((t, i) => ({
          quotationId: quotation.id,
          label: t.label,
          percentage: String(t.persen),
          milestoneTriggerLabel: t.pemicu || null,
          sortOrder: i,
        })),
      );
    }
    if (input.kelengkapan.length) {
      await insertKelengkapan(tx, quotation.id, input.kelengkapan);
    }

    return assembleSph(tx, quotation);
  });
}

export async function updateQuotation(userId: string, id: string, input: UpdatePenawaranInput): Promise<Sph> {
  return withUserTransaction(userId, async (tx) => {
    const [existing] = await tx
      .select()
      .from(schema.quotations)
      .where(and(eq(schema.quotations.id, id), isNull(schema.quotations.deletedAt)))
      .limit(1);
    if (!existing) throw new NotFoundError("Penawaran tidak ditemukan.");

    const statusId = input.status ? await loadStatusIdByLabel(tx, STATUS_LABEL_BY_ENUM[input.status]) : undefined;
    const totalAmount = input.items ? input.items.reduce((sum, item) => sum + computeLineTotal(item), 0) : undefined;

    const [quotation] = await tx
      .update(schema.quotations)
      .set({
        ...quotationColumnsFromInput(input),
        ...(input.perusahaanId !== undefined && { companyId: input.perusahaanId }),
        ...(statusId !== undefined && { statusId }),
        ...(totalAmount !== undefined && { totalAmount: String(totalAmount) }),
        updatedBy: userId,
      })
      .where(eq(schema.quotations.id, id))
      .returning();

    // Full replace of items/RAB/jadwal/termin when a new items[]/termin[] array
    // is provided — same delete-then-insert pattern as Perusahaan's PIC replace.
    if (input.items !== undefined || input.termin !== undefined) {
      await deleteChildren(tx, id);
      const items = input.items ?? [];
      for (const [i, item] of items.entries()) {
        await insertItem(tx, userId, id, item, i);
      }
      const termin = input.termin ?? [];
      if (termin.length) {
        await tx.insert(schema.quotationTermScheme).values(
          termin.map((t, i) => ({
            quotationId: id,
            label: t.label,
            percentage: String(t.persen),
            milestoneTriggerLabel: t.pemicu || null,
            sortOrder: i,
          })),
        );
      }
    }

    // Gated independently of items/termin above: a pure status transition or
    // an items-only edit must never wipe kelengkapan (or vice versa).
    if (input.kelengkapan !== undefined) {
      await tx.delete(schema.quotationKelengkapan).where(eq(schema.quotationKelengkapan.quotationId, id));
      await insertKelengkapan(tx, id, input.kelengkapan);
    }

    // Faktur no longer has its own edit UI — push the current SPH state (not
    // just this call's changed fields) into every Faktur Induk born from it,
    // so a Deal SPH edit always keeps Faktur in sync regardless of which
    // subset of fields this particular PATCH touched.
    const freshTermScheme = await tx
      .select({ label: schema.quotationTermScheme.label, percentage: schema.quotationTermScheme.percentage, pemicu: schema.quotationTermScheme.milestoneTriggerLabel })
      .from(schema.quotationTermScheme)
      .where(eq(schema.quotationTermScheme.quotationId, id))
      .orderBy(asc(schema.quotationTermScheme.sortOrder));
    const freshServiceIds = await tx
      .select({ serviceId: schema.quotationItems.serviceId })
      .from(schema.quotationItems)
      .where(eq(schema.quotationItems.quotationId, id))
      .then((rows) => [...new Set(rows.map((r) => r.serviceId).filter((x): x is string => !!x))]);
    await syncFakturIndukFromSph(tx, userId, id, {
      serviceIds: freshServiceIds,
      totalBiaya: Number(quotation.totalAmount),
      terminScheme: freshTermScheme.map((t) => ({ label: t.label, persen: Number(t.percentage), pemicu: t.pemicu ?? null })),
    });

    return assembleSph(tx, quotation);
  });
}

/** Deal-time cascade — auto-creates the Proyek (and, from it, a Faktur Induk
 * billing every service at the SPH's full value/termin scheme) so the user
 * doesn't have to trigger "Buat Proyek"/"Buat Faktur Induk" by hand. Both stay
 * fully editable afterward (Ubah Proyek / Faktur's own edit form) — this just
 * seeds sensible defaults. Idempotent: skips entirely if a project already
 * exists for this quotation (e.g. status flipped away from Deal and back, or
 * one was already created manually before this cascade shipped). Runs inside
 * the caller's transaction (updateQuotationStatus), not its own. */
async function createProyekAndFakturForDeal(tx: Tx, userId: string, quotationId: string): Promise<void> {
  const [existingProject] = await tx
    .select({ id: schema.projects.id })
    .from(schema.projects)
    .where(eq(schema.projects.quotationId, quotationId))
    .limit(1);
  if (existingProject) return;

  const [quotation] = await tx.select().from(schema.quotations).where(eq(schema.quotations.id, quotationId)).limit(1);
  if (!quotation) return;
  const company = await loadCompany(tx, quotation.companyId);

  const project = await createProyekTx(tx, userId, {
    nama: `Proyek — ${company.name}`,
    perusahaanId: quotation.companyId,
    areaId: undefined,
    tahun: new Date(quotation.date).getFullYear(),
    sphId: quotationId,
    serviceIds: [],
    assigneeIds: [],
  });

  const termScheme = await tx
    .select({ label: schema.quotationTermScheme.label, percentage: schema.quotationTermScheme.percentage, pemicu: schema.quotationTermScheme.milestoneTriggerLabel })
    .from(schema.quotationTermScheme)
    .where(eq(schema.quotationTermScheme.quotationId, quotationId))
    .orderBy(asc(schema.quotationTermScheme.sortOrder));
  if (!termScheme.length) return; // createFakturIndukSchema requires >=1 termin — nothing sensible to seed without it

  await createFakturIndukTx(tx, userId, {
    proyekId: project.id,
    serviceIds: project.layanan.map((l) => l.serviceId).filter((x): x is string => !!x),
    totalBiaya: Number(quotation.totalAmount),
    notes: "",
    terminScheme: termScheme.map((t) => ({ label: t.label, persen: Number(t.percentage), pemicu: t.pemicu ?? null })),
    // Inherit the SPH's own signature choice as a starting point — editable
    // afterward via updateFakturInduk, same "one-time copy" pattern as the
    // rest of this cascade.
    useDigitalSignature: quotation.useDigitalSignature,
    signatureTemplateId: quotation.signatureTemplateId,
  });
}

export async function updateQuotationStatus(userId: string, id: string, status: SphStatus): Promise<Sph> {
  return withUserTransaction(userId, async (tx) => {
    const [existing] = await tx
      .select({ id: schema.quotations.id })
      .from(schema.quotations)
      .where(and(eq(schema.quotations.id, id), isNull(schema.quotations.deletedAt)))
      .limit(1);
    if (!existing) throw new NotFoundError("Penawaran tidak ditemukan.");

    const statusId = await loadStatusIdByLabel(tx, STATUS_LABEL_BY_ENUM[status]);
    const [quotation] = await tx
      .update(schema.quotations)
      .set({ statusId, updatedBy: userId })
      .where(eq(schema.quotations.id, id))
      .returning();

    if (status === "deal") {
      await createProyekAndFakturForDeal(tx, userId, id);
    }

    return assembleSph(tx, quotation);
  });
}

export async function deleteQuotation(userId: string, id: string): Promise<void> {
  await withUserTransaction(userId, async (tx) => {
    const [existing] = await tx
      .select({ id: schema.quotations.id })
      .from(schema.quotations)
      .where(and(eq(schema.quotations.id, id), isNull(schema.quotations.deletedAt)))
      .limit(1);
    if (!existing) throw new NotFoundError("Penawaran tidak ditemukan.");
    await tx
      .update(schema.quotations)
      .set({ deletedAt: new Date(), deletedBy: userId })
      .where(eq(schema.quotations.id, id));
  });
}
