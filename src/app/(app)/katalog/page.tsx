"use client";
import * as React from "react";
import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { BookOpen, FileText, FolderKanban, MoreHorizontal, Pencil, Plus, SlidersHorizontal, Trash2 } from "lucide-react";
import { DataTable } from "@/components/shared/data-table";
import { ErrorState } from "@/components/shared/error-state";
import { FormSheet } from "@/components/shared/form-sheet";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { MultiSelectFilter, type MultiSelectOption } from "@/components/shared/multi-select-filter";
import { StatusBadge, type StatusBadgeConfig } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldError, FieldDescription } from "@/components/ui/field";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  InputGroup, InputGroupAddon, InputGroupInput, InputGroupText,
} from "@/components/ui/input-group";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { StatTile, InfoRow, InfoList, SectionLabel } from "@/components/shared/detail-drawer";
import { formatRupiah, formatRupiahCompact } from "@/lib/format";
import { useKatalogList, useCreateLayanan, useUpdateLayanan, useDeleteLayanan } from "@/lib/query/katalog";
import { useOptionList } from "@/lib/query/daftar-pilihan";
import { useMilestoneTemplateList } from "@/lib/query/milestone-templates";
import { onFormInvalid } from "@/lib/form-toast";
import type { Layanan } from "@/lib/schemas/katalog";

const STATUS_BADGE: Record<Layanan["status"], StatusBadgeConfig> = {
  aktif: { label: "Aktif", variant: "success" },
  terarsip: { label: "Terarsip", variant: "secondary" },
};

const STATUS_OPTIONS: MultiSelectOption[] = Object.entries(STATUS_BADGE).map(([value, m]) => ({
  value, label: m.label, variant: m.variant,
}));

function harga(value: number | null) {
  return value === null ? "—" : formatRupiahCompact(value);
}

function makeColumns(
  onOpen: (l: Layanan) => void,
  onEdit: (l: Layanan) => void,
  onDelete: (l: Layanan) => void,
): ColumnDef<Layanan>[] {
  return [
    {
      accessorKey: "number", header: "No. Layanan", meta: { mono: true },
      cell: ({ row }) => (
        <button type="button" onClick={() => onOpen(row.original)}
          className="rounded-sm font-mono text-(--link) hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
          {row.original.number ?? "—"}
        </button>
      ),
    },
    {
      accessorKey: "nama", header: "Nama Layanan", meta: { className: "min-w-64" },
      cell: ({ row }) => (
        <button type="button" onClick={() => onOpen(row.original)}
          className="rounded-sm text-left font-medium hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
          {row.original.nama}
        </button>
      ),
    },
    {
      accessorKey: "jenisDokumen", header: "Jenis", meta: { className: "text-center" },
      cell: ({ row }) => <Badge variant="info">{row.original.jenisDokumen}</Badge>,
    },
    { accessorKey: "kewenangan", header: "Kewenangan" },
    {
      accessorKey: "hargaStandar", header: "Harga Standar",
      meta: { mono: true },
      cell: ({ row }) => harga(row.original.hargaStandar),
    },
    {
      accessorKey: "status", header: "Status", meta: { className: "text-center" },
      cell: ({ row }) => <StatusBadge status={row.original.status} map={STATUS_BADGE} />,
    },
    {
      id: "actions", header: "", meta: { className: "w-10" },
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger className="outline-none">
            <MoreHorizontal className="size-4 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => onEdit(row.original)}>
              <Pencil className="size-3.5" /> Ubah
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => onDelete(row.original)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="size-3.5" /> Hapus
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];
}

function LayananDetail({ l }: { l: Layanan }) {
  return (
    <div className="space-y-6 px-4 pb-8">
      <section>
        <SectionLabel>Ringkasan</SectionLabel>
        <div className="grid grid-cols-2 gap-2">
          <StatTile label="Dipakai di SPH" value={String(l.metrik.dipakaiSPH)} icon={FileText} />
          <StatTile label="Proyek" value={String(l.metrik.dipakaiProyek)} icon={FolderKanban} />
        </div>
      </section>

      <section>
        <SectionLabel>Detail Layanan</SectionLabel>
        <InfoList>
          <InfoRow label="Jenis Dokumen" value={l.jenisDokumen} />
          <InfoRow label="Kewenangan" value={l.kewenangan} />
          <InfoRow label="Dasar Hukum" value={l.dasarHukum ?? "—"} />
          <InfoRow
            label="Harga Standar"
            value={l.hargaStandar === null ? "Diisi manual di SPH" : formatRupiah(l.hargaStandar)}
          />
          <InfoRow label="Berulang" value={l.isRecurring ? "Ya" : "Tidak"} />
        </InfoList>
      </section>
    </div>
  );
}

/* ---------- create form ---------- */

const layananCreateSchema = z.object({
  nama: z.string().min(1, "Nama layanan wajib diisi."),
  documentTypeId: z.string().min(1, "Jenis dokumen wajib dipilih."),
  authorityId: z.string().min(1, "Kewenangan wajib dipilih."),
  legalBasisId: z.string().optional(),
  hargaStandar: z.string(),
  isRecurring: z.boolean().optional(),
  milestoneTemplateId: z.string().optional(),
});
type LayananCreate = z.infer<typeof layananCreateSchema>;

function LayananCreateForm({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { mutateAsync, isPending } = useCreateLayanan();
  const { data: jenisDokumenOptions = [] } = useOptionList("jenis_dokumen");
  const { data: kewenanganOptions = [] } = useOptionList("kewenangan");
  const { data: dasarHukumOptions = [] } = useOptionList("dasar_hukum");
  const { data: milestoneTemplates = [] } = useMilestoneTemplateList();
  const form = useForm<LayananCreate>({
    resolver: zodResolver(layananCreateSchema),
    defaultValues: { nama: "", documentTypeId: "", authorityId: "", legalBasisId: "", hargaStandar: "", isRecurring: false, milestoneTemplateId: "" },
  });
  const { register, handleSubmit, control, reset, formState: { errors } } = form;

  const onSubmit = handleSubmit(async (values) => {
    const hargaNum = values.hargaStandar.trim()
      ? Number(values.hargaStandar.replace(/\D/g, ""))
      : null;
    await mutateAsync({
      nama: values.nama,
      documentTypeId: values.documentTypeId,
      authorityId: values.authorityId,
      legalBasisId: values.legalBasisId,
      hargaStandar: hargaNum,
      isRecurring: values.isRecurring,
      milestoneTemplateId: values.milestoneTemplateId || null,
    });
    onOpenChange(false);
    reset();
  }, onFormInvalid);

  return (
    <FormSheet
      open={open}
      onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}
      title="Tambah Layanan"
      description="Tambahkan jenis layanan perizinan ke katalog."
      onSubmit={onSubmit}
      submitLabel={isPending ? "Menyimpan…" : "Simpan"}
    >
      <Field data-invalid={!!errors.nama}>
        <FieldLabel htmlFor="l-nama">Nama Layanan</FieldLabel>
        <Input id="l-nama" placeholder="Penyusunan Pertek Air Limbah" aria-invalid={!!errors.nama} {...register("nama")} />
        <FieldError errors={errors.nama ? [errors.nama] : undefined} />
      </Field>

      <Field data-invalid={!!errors.documentTypeId}>
        <FieldLabel htmlFor="l-jenis">Jenis Dokumen</FieldLabel>
        <Controller
          control={control}
          name="documentTypeId"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="l-jenis" className="w-full" aria-invalid={!!errors.documentTypeId}>
                <SelectValue placeholder="Pilih jenis dokumen" />
              </SelectTrigger>
              <SelectContent>
                {jenisDokumenOptions.map((v) => <SelectItem key={v.id} value={v.id}>{v.nama}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        />
        <FieldError errors={errors.documentTypeId ? [errors.documentTypeId] : undefined} />
      </Field>

      <Field data-invalid={!!errors.authorityId}>
        <FieldLabel htmlFor="l-kewenangan">Kewenangan</FieldLabel>
        <Controller
          control={control}
          name="authorityId"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="l-kewenangan" className="w-full" aria-invalid={!!errors.authorityId}>
                <SelectValue placeholder="Pilih kewenangan" />
              </SelectTrigger>
              <SelectContent>
                {kewenanganOptions.map((v) => <SelectItem key={v.id} value={v.id}>{v.nama}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        />
        <FieldError errors={errors.authorityId ? [errors.authorityId] : undefined} />
      </Field>

      <Field>
        <FieldLabel htmlFor="l-dasar">Dasar Hukum (opsional)</FieldLabel>
        <Controller
          control={control}
          name="legalBasisId"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="l-dasar" className="w-full">
                <SelectValue placeholder="Pilih dasar hukum…" />
              </SelectTrigger>
              <SelectContent>
                {dasarHukumOptions.map((v) => <SelectItem key={v.id} value={v.id}>{v.nama}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="l-harga">Harga Standar (opsional)</FieldLabel>
        <InputGroup>
          <InputGroupAddon>
            <InputGroupText>Rp</InputGroupText>
          </InputGroupAddon>
          <InputGroupInput id="l-harga" inputMode="numeric" placeholder="75000000" className="text-right font-mono tabular-nums" {...register("hargaStandar")} />
        </InputGroup>
        <FieldDescription>Harga standar; masih dapat disesuaikan per proyek di SPH.</FieldDescription>
      </Field>

      <Field className="flex-row items-center gap-2">
        <Controller
          control={control}
          name="isRecurring"
          render={({ field }) => (
            <Checkbox checked={field.value ?? false} onCheckedChange={(c) => field.onChange(c === true)} />
          )}
        />
        <FieldLabel className="font-normal">Berulang (mis. Laporan Semester)</FieldLabel>
      </Field>

      <Field>
        <FieldLabel htmlFor="l-milestone">Template Milestone (opsional)</FieldLabel>
        <Controller
          control={control}
          name="milestoneTemplateId"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="l-milestone" className="w-full">
                <SelectValue placeholder="Tidak ada" />
              </SelectTrigger>
              <SelectContent>
                {milestoneTemplates.map((t) => <SelectItem key={t.id} value={t.id}>{t.nama}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        />
      </Field>
    </FormSheet>
  );
}

/* ---------- edit form ---------- */

const layananEditSchema = z.object({
  nama: z.string().min(1, "Nama layanan wajib diisi."),
  documentTypeId: z.string().min(1, "Jenis dokumen wajib dipilih."),
  authorityId: z.string().min(1, "Kewenangan wajib dipilih."),
  legalBasisId: z.string().optional(),
  hargaStandar: z.string(),
  isRecurring: z.boolean().optional(),
  status: z.enum(["aktif", "terarsip"]),
  milestoneTemplateId: z.string().optional(),
});
type LayananEdit = z.infer<typeof layananEditSchema>;

function LayananEditForm({
  layanan,
  open,
  onOpenChange,
  onSuccess,
}: {
  layanan: Layanan;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (updated: Layanan) => void;
}) {
  const { mutateAsync, isPending } = useUpdateLayanan();
  const { data: jenisDokumenOptions = [] } = useOptionList("jenis_dokumen");
  const { data: kewenanganOptions = [] } = useOptionList("kewenangan");
  const { data: dasarHukumOptions = [] } = useOptionList("dasar_hukum");
  const { data: milestoneTemplates = [] } = useMilestoneTemplateList();
  const defaults = React.useCallback((l: Layanan): LayananEdit => ({
    nama: l.nama,
    documentTypeId: l.documentTypeId ?? "",
    authorityId: l.authorityId ?? "",
    legalBasisId: l.legalBasisId ?? "",
    hargaStandar: l.hargaStandar === null ? "" : String(l.hargaStandar),
    isRecurring: l.isRecurring,
    status: l.status,
    milestoneTemplateId: l.milestoneTemplateId ?? "",
  }), []);
  const form = useForm<LayananEdit>({
    resolver: zodResolver(layananEditSchema),
    defaultValues: defaults(layanan),
  });
  const { register, handleSubmit, control, reset, formState: { errors } } = form;

  React.useEffect(() => {
    if (open) reset(defaults(layanan));
  }, [open, layanan, reset, defaults]);

  const onSubmit = handleSubmit(async (values) => {
    const hargaNum = values.hargaStandar.trim()
      ? Number(values.hargaStandar.replace(/\D/g, ""))
      : null;
    const updated = await mutateAsync({
      id: layanan.id,
      input: {
        nama: values.nama,
        documentTypeId: values.documentTypeId,
        authorityId: values.authorityId,
        legalBasisId: values.legalBasisId || null,
        hargaStandar: hargaNum,
        isRecurring: values.isRecurring,
        status: values.status,
        milestoneTemplateId: values.milestoneTemplateId || null,
      },
    });
    onSuccess(updated);
    onOpenChange(false);
  }, onFormInvalid);

  return (
    <FormSheet
      open={open}
      onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}
      title="Ubah Layanan"
      description={`Perbarui data layanan ${layanan.nama}.`}
      onSubmit={onSubmit}
      submitLabel={isPending ? "Menyimpan…" : "Simpan Perubahan"}
    >
      <Field data-invalid={!!errors.nama}>
        <FieldLabel htmlFor="e-nama">Nama Layanan</FieldLabel>
        <Input id="e-nama" aria-invalid={!!errors.nama} {...register("nama")} />
        <FieldError errors={errors.nama ? [errors.nama] : undefined} />
      </Field>

      <Field data-invalid={!!errors.documentTypeId}>
        <FieldLabel htmlFor="e-jenis">Jenis Dokumen</FieldLabel>
        <Controller
          control={control}
          name="documentTypeId"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="e-jenis" className="w-full" aria-invalid={!!errors.documentTypeId}>
                <SelectValue placeholder="Pilih jenis dokumen" />
              </SelectTrigger>
              <SelectContent>
                {jenisDokumenOptions.map((v) => <SelectItem key={v.id} value={v.id}>{v.nama}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        />
        <FieldError errors={errors.documentTypeId ? [errors.documentTypeId] : undefined} />
      </Field>

      <Field data-invalid={!!errors.authorityId}>
        <FieldLabel htmlFor="e-kewenangan">Kewenangan</FieldLabel>
        <Controller
          control={control}
          name="authorityId"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="e-kewenangan" className="w-full" aria-invalid={!!errors.authorityId}>
                <SelectValue placeholder="Pilih kewenangan" />
              </SelectTrigger>
              <SelectContent>
                {kewenanganOptions.map((v) => <SelectItem key={v.id} value={v.id}>{v.nama}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        />
        <FieldError errors={errors.authorityId ? [errors.authorityId] : undefined} />
      </Field>

      <Field>
        <FieldLabel htmlFor="e-dasar">Dasar Hukum (opsional)</FieldLabel>
        <Controller
          control={control}
          name="legalBasisId"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="e-dasar" className="w-full">
                <SelectValue placeholder="Pilih dasar hukum…" />
              </SelectTrigger>
              <SelectContent>
                {dasarHukumOptions.map((v) => <SelectItem key={v.id} value={v.id}>{v.nama}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="e-harga">Harga Standar (opsional)</FieldLabel>
        <InputGroup>
          <InputGroupAddon>
            <InputGroupText>Rp</InputGroupText>
          </InputGroupAddon>
          <InputGroupInput id="e-harga" inputMode="numeric" className="text-right font-mono tabular-nums" {...register("hargaStandar")} />
        </InputGroup>
        <FieldDescription>Harga standar; masih dapat disesuaikan per proyek di SPH.</FieldDescription>
      </Field>

      <Field className="flex-row items-center gap-2">
        <Controller
          control={control}
          name="isRecurring"
          render={({ field }) => (
            <Checkbox checked={field.value ?? false} onCheckedChange={(c) => field.onChange(c === true)} />
          )}
        />
        <FieldLabel className="font-normal">Berulang (mis. Laporan Semester)</FieldLabel>
      </Field>

      <Field>
        <FieldLabel htmlFor="e-status">Status</FieldLabel>
        <Controller
          control={control}
          name="status"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="e-status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="aktif">Aktif</SelectItem>
                <SelectItem value="terarsip">Terarsip</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="e-milestone">Template Milestone (opsional)</FieldLabel>
        <Controller
          control={control}
          name="milestoneTemplateId"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="e-milestone" className="w-full">
                <SelectValue placeholder="Tidak ada" />
              </SelectTrigger>
              <SelectContent>
                {milestoneTemplates.map((t) => <SelectItem key={t.id} value={t.id}>{t.nama}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        />
      </Field>
    </FormSheet>
  );
}

type LayananStatus = Layanan["status"];

export default function KatalogPage() {
  const { data, isLoading, isError, refetch } = useKatalogList();
  const { mutate: deleteLayanan, isPending: isDeleting } = useDeleteLayanan();
  const { data: kewenanganOptionsData = [] } = useOptionList("kewenangan");
  const kewenanganOptions: MultiSelectOption[] = kewenanganOptionsData.map((v) => ({ value: v.nama, label: v.nama }));
  const [selected, setSelected] = useState<Layanan | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Layanan | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Layanan | null>(null);

  const columns = makeColumns(setSelected, setEditTarget, setDeleteTarget);

  // Filter state
  const [filterOpen, setFilterOpen]               = React.useState(false);
  const [pendingStatus, setPendingStatus]         = React.useState<LayananStatus[]>([]);
  const [pendingKewenangan, setPendingKewenangan] = React.useState<string[]>([]);
  const [appliedStatus, setAppliedStatus]         = React.useState<LayananStatus[]>([]);
  const [appliedKewenangan, setAppliedKewenangan] = React.useState<string[]>([]);

  const hasFilter  = appliedStatus.length > 0 || appliedKewenangan.length > 0;
  const hasPending = pendingStatus.length > 0 || pendingKewenangan.length > 0;
  const filterCount = (appliedStatus.length > 0 ? 1 : 0) + (appliedKewenangan.length > 0 ? 1 : 0);

  const openFilter = () => {
    setPendingStatus(appliedStatus);
    setPendingKewenangan(appliedKewenangan);
    setFilterOpen(true);
  };
  const applyFilter = () => {
    setAppliedStatus(pendingStatus);
    setAppliedKewenangan(pendingKewenangan);
    setFilterOpen(false);
  };
  const resetFilter = () => {
    setPendingStatus([]); setPendingKewenangan([]);
    setAppliedStatus([]); setAppliedKewenangan([]);
    setFilterOpen(false);
  };

  const filteredData = React.useMemo(() => {
    let base = data ?? [];
    if (appliedStatus.length > 0)
      base = base.filter((l) => appliedStatus.includes(l.status));
    if (appliedKewenangan.length > 0)
      base = base.filter((l) => appliedKewenangan.includes(l.kewenangan));
    return base;
  }, [data, appliedStatus, appliedKewenangan]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <BookOpen className="size-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold tracking-tight">Katalog Layanan</h1>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" /> Tambah Layanan
        </Button>
      </div>

      <LayananCreateForm open={createOpen} onOpenChange={setCreateOpen} />

      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <DataTable
          columns={columns}
          data={filteredData}
          loading={isLoading}
          searchColumns={["number", "nama"]}
          searchPlaceholder="Cari nomor atau nama layanan…"
          emptyMessage="Belum ada layanan"
          defaultSorting={[{ id: "number", desc: true }]}
          rowActions={false}
          toolbarActions={
            <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={openFilter}>
              <SlidersHorizontal className="size-3.5" />
              Filter
              {hasFilter && (
                <Badge variant="secondary" className="px-1.5 py-0 text-xs">{filterCount}</Badge>
              )}
            </Button>
          }
        />
      )}

      {/* Filter dialog */}
      <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Filter Katalog</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-1">
            {/* Status */}
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</p>
              <MultiSelectFilter
                options={STATUS_OPTIONS}
                value={pendingStatus}
                onChange={(v) => setPendingStatus(v as LayananStatus[])}
                placeholder="Pilih status…"
                searchPlaceholder="Cari status…"
                noun="status"
              />
            </div>

            {/* Kewenangan */}
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Kewenangan</p>
              <MultiSelectFilter
                options={kewenanganOptions}
                value={pendingKewenangan}
                onChange={(v) => setPendingKewenangan(v)}
                placeholder="Pilih kewenangan…"
                searchPlaceholder="Cari kewenangan…"
                noun="kewenangan"
              />
            </div>
          </div>

          <DialogFooter className="flex-row items-center gap-2">
            <Button
              variant={hasPending ? "ghost" : "outline"}
              size="sm"
              className="mr-auto"
              onClick={resetFilter}
            >
              {hasPending ? "Reset" : "Tutup"}
            </Button>
            <Button size="sm" onClick={applyFilter}>Terapkan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit form */}
      {editTarget && (
        <LayananEditForm
          layanan={editTarget}
          open={!!editTarget}
          onOpenChange={(o) => { if (!o) setEditTarget(null); }}
          onSuccess={(updated) => {
            if (selected?.id === updated.id) setSelected(updated);
            setEditTarget(null);
          }}
        />
      )}

      {/* Delete confirm */}
      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}
        entityLabel="Layanan"
        target={deleteTarget?.nama}
        loading={isDeleting}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteLayanan(deleteTarget.id, {
            onSuccess: () => {
              if (selected?.id === deleteTarget.id) setSelected(null);
              setDeleteTarget(null);
            },
          });
        }}
      />

      {/* Detail sheet */}
      <Sheet open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <SheetContent className="overflow-y-auto sm:max-w-md">
          {selected && (
            <>
              <SheetHeader className="pr-10">
                <div className="mb-1 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <BookOpen className="size-5" />
                </div>
                <SheetTitle className="text-lg leading-tight font-semibold wrap-break-word">{selected.nama}</SheetTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <SheetDescription className="font-mono text-sm text-muted-foreground">{selected.number ?? "—"}</SheetDescription>
                  <StatusBadge status={selected.status} map={STATUS_BADGE} />
                </div>
              </SheetHeader>
              <LayananDetail l={selected} />
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
