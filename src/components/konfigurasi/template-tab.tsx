"use client";
import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { ColumnDef } from "@tanstack/react-table";
import { GripVertical, MoreHorizontal, Pencil, Plus, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { DataTable } from "@/components/shared/data-table";
import { FormSheet } from "@/components/shared/form-sheet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { onFormInvalid } from "@/lib/form-toast";
import { rowNumberColumn } from "@/components/konfigurasi/row-number-column";
import {
  useMilestoneTemplateList, useCreateMilestoneTemplate, useUpdateMilestoneTemplate, useDeleteMilestoneTemplate,
} from "@/lib/query/milestone-templates";
import {
  useTerminTemplateList, useCreateTerminTemplate, useUpdateTerminTemplate, useDeleteTerminTemplate,
} from "@/lib/query/termin-templates";
import {
  usePdfTemplateList, useCreatePdfTemplate, useUpdatePdfTemplate, useDeletePdfTemplate,
} from "@/lib/query/pdf-templates";
import type { MilestoneTemplate, MilestoneTemplateStep } from "@/lib/schemas/milestone-templates";
import type { TerminTemplate, TerminTemplateStep } from "@/lib/schemas/termin-templates";
import type { PdfTemplate, PdfTemplateDocumentType } from "@/lib/schemas/pdf-templates";

const DOC_TYPE_LABEL: Record<PdfTemplateDocumentType, string> = {
  sph: "SPH",
  invoice: "Invoice",
  slip_gaji: "Slip Gaji",
};

// ── Generic drag-reorder row array editor (mirrors kelengkapan/page.tsx's
// ItemsEditor, generalized over the row shape via a render-prop) ──────────

function ArrayStepsEditor<T>({
  rows,
  onChange,
  makeEmpty,
  isEmpty,
  renderRow,
}: {
  rows: T[];
  onChange: (rows: T[]) => void;
  makeEmpty: () => T;
  isEmpty: (row: T) => boolean;
  renderRow: (row: T, index: number, update: (patch: Partial<T>) => void) => React.ReactNode;
}) {
  const [dragIdx, setDragIdx] = React.useState<number | null>(null);
  const [overIdx, setOverIdx] = React.useState<number | null>(null);

  const add = () => onChange([...rows, makeEmpty()]);
  const remove = (i: number) => onChange(rows.filter((_, idx) => idx !== i));
  const update = (i: number, patch: Partial<T>) =>
    onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const move = (from: number, to: number) => {
    if (from === to || to < 0 || to >= rows.length) return;
    const next = [...rows];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  };
  const resetDrag = () => { setDragIdx(null); setOverIdx(null); };

  return (
    <div className="space-y-2">
      {rows.map((row, i) => (
        <div
          key={i}
          onDragOver={(e) => { e.preventDefault(); if (dragIdx !== null && overIdx !== i) setOverIdx(i); }}
          onDrop={(e) => { e.preventDefault(); if (dragIdx !== null) move(dragIdx, i); resetDrag(); }}
          className={cn(
            "flex items-start gap-2 rounded-md transition-colors",
            dragIdx === i && "opacity-40",
            overIdx === i && dragIdx !== null && dragIdx !== i && "ring-1 ring-primary/50",
          )}
        >
          <span
            draggable
            onDragStart={(e) => { setDragIdx(i); e.dataTransfer.effectAllowed = "move"; }}
            onDragEnd={resetDrag}
            className="mt-2 shrink-0 cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
            aria-label="Seret untuk mengurutkan"
          >
            <GripVertical className="size-4" />
          </span>
          <span className="mt-2 w-5 shrink-0 text-xs text-muted-foreground">{i + 1}.</span>
          <div className="flex-1">{renderRow(row, i, (patch) => update(i, patch))}</div>
          <Button
            type="button" variant="ghost" size="icon" className="mt-1 size-7 shrink-0"
            onClick={() => remove(i)} disabled={rows.length <= 1 && isEmpty(row)}
          >
            <X className="size-3.5" />
          </Button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-border py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:bg-muted/40 hover:text-foreground"
      >
        <Plus className="size-3.5" /> Tambah Tahap
      </button>
    </div>
  );
}

/* ══════════════════════════ Milestone ══════════════════════════ */

const milestoneFormSchema = z.object({
  nama: z.string().min(1, "Nama template wajib diisi."),
  steps: z.array(z.object({ nama: z.string(), triggersTerm: z.boolean() }))
    .refine((arr) => arr.some((s) => s.nama.trim() !== ""), { message: "Tambahkan minimal satu tahap." }),
});
type MilestoneForm = z.infer<typeof milestoneFormSchema>;

function MilestoneStepsField({ value, onChange }: { value: MilestoneTemplateStep[]; onChange: (v: MilestoneTemplateStep[]) => void }) {
  return (
    <ArrayStepsEditor
      rows={value}
      onChange={onChange}
      makeEmpty={() => ({ nama: "", triggersTerm: false })}
      isEmpty={(r) => r.nama.trim() === ""}
      renderRow={(row, i, update) => (
        <div className="flex items-center gap-2">
          <Input
            value={row.nama}
            onChange={(e) => update({ nama: e.target.value })}
            placeholder="Nama tahap…"
            className="flex-1 text-sm"
          />
          <label className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
            <Checkbox checked={row.triggersTerm} onCheckedChange={(v) => update({ triggersTerm: !!v })} />
            Memicu Termin
          </label>
        </div>
      )}
    />
  );
}

function MilestoneForm_({
  initial, onSubmitTemplate, open, onOpenChange, title, submitLabel,
}: {
  initial: MilestoneForm;
  onSubmitTemplate: (values: MilestoneForm) => Promise<void>;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  submitLabel: string;
}) {
  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<MilestoneForm>({
    resolver: zodResolver(milestoneFormSchema),
    defaultValues: initial,
  });
  const steps = watch("steps");

  React.useEffect(() => { if (open) reset(initial); }, [open, initial, reset]);

  const hasStep = steps.some((s) => s.nama.trim() !== "");
  const onSubmit = handleSubmit(async (values) => {
    await onSubmitTemplate({ ...values, steps: values.steps.filter((s) => s.nama.trim() !== "") });
    onOpenChange(false);
  }, onFormInvalid);

  return (
    <FormSheet
      open={open}
      onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}
      title={title}
      onSubmit={onSubmit}
      submitLabel={submitLabel}
      submitDisabled={!hasStep}
    >
      <Field data-invalid={!!errors.nama}>
        <FieldLabel>Nama Template</FieldLabel>
        <Input {...register("nama")} />
        <FieldError errors={errors.nama ? [errors.nama] : undefined} />
      </Field>
      <Field data-invalid={!!errors.steps}>
        <FieldLabel>Tahapan Milestone</FieldLabel>
        <MilestoneStepsField value={steps} onChange={(v) => setValue("steps", v, { shouldValidate: true })} />
        <FieldError errors={errors.steps?.message ? [{ message: errors.steps.message }] : undefined} />
      </Field>
    </FormSheet>
  );
}

function makeMilestoneColumns(
  onEdit: (t: MilestoneTemplate) => void,
  onDuplicate: (t: MilestoneTemplate) => void,
  onDelete: (t: MilestoneTemplate) => void,
): ColumnDef<MilestoneTemplate>[] {
  return [
    rowNumberColumn<MilestoneTemplate>(),
    {
      accessorKey: "nama", header: "Nama", enableSorting: false, meta: { className: "min-w-56" },
      cell: ({ row }) => (
        <button type="button" onClick={() => onEdit(row.original)} className="rounded-sm text-left font-medium hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
          {row.original.nama}
        </button>
      ),
    },
    { id: "jumlah", header: "Jumlah Tahap", cell: ({ row }) => `${row.original.steps.length} tahap` },
    {
      id: "actions", header: "", enableSorting: false, meta: { className: "w-10" },
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger className="outline-none"><MoreHorizontal className="size-4 text-muted-foreground" /></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => onEdit(row.original)}><Pencil className="size-3.5" /> Ubah</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onDuplicate(row.original)}><Plus className="size-3.5" /> Duplikasi</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onDelete(row.original)} className="text-destructive focus:text-destructive"><Trash2 className="size-3.5" /> Hapus</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];
}

function MilestoneSection() {
  const { data, isLoading } = useMilestoneTemplateList();
  const { mutateAsync: create } = useCreateMilestoneTemplate();
  const { mutateAsync: update } = useUpdateMilestoneTemplate();
  const { mutate: remove, isPending: isDeleting } = useDeleteMilestoneTemplate();
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<MilestoneTemplate | null>(null);
  const [duplicateSource, setDuplicateSource] = React.useState<MilestoneTemplate | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<MilestoneTemplate | null>(null);

  const columns = makeMilestoneColumns(setEditTarget, setDuplicateSource, setDeleteTarget);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="size-4" /> Tambah Template Milestone</Button>
      </div>

      <MilestoneForm_
        key="create"
        initial={{ nama: "", steps: [{ nama: "", triggersTerm: false }] }}
        onSubmitTemplate={async (values) => { await create(values); }}
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Tambah Template Milestone"
        submitLabel="Simpan"
      />

      {editTarget && (
        <MilestoneForm_
          key={`edit-${editTarget.id}`}
          initial={{ nama: editTarget.nama, steps: editTarget.steps }}
          onSubmitTemplate={async (values) => { await update({ id: editTarget.id, input: values }); }}
          open={!!editTarget}
          onOpenChange={(o) => { if (!o) setEditTarget(null); }}
          title="Ubah Template Milestone"
          submitLabel="Simpan Perubahan"
        />
      )}

      {duplicateSource && (
        <MilestoneForm_
          key={`dup-${duplicateSource.id}`}
          initial={{ nama: `Salinan ${duplicateSource.nama}`, steps: duplicateSource.steps }}
          onSubmitTemplate={async (values) => { await create(values); }}
          open={!!duplicateSource}
          onOpenChange={(o) => { if (!o) setDuplicateSource(null); }}
          title="Duplikasi Template Milestone"
          submitLabel="Duplikasi"
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Template?</AlertDialogTitle>
            <AlertDialogDescription><strong>{deleteTarget?.nama}</strong> akan dihapus permanen.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
              onClick={() => { if (!deleteTarget) return; remove(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) }); }}
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DataTable columns={columns} data={data ?? []} loading={isLoading} searchColumns={["nama"]} searchPlaceholder="Cari template…" emptyMessage="Belum ada template milestone" rowActions={false} />
    </div>
  );
}

/* ══════════════════════════ Termin ══════════════════════════ */

const terminFormSchema = z.object({
  nama: z.string().min(1, "Nama template wajib diisi."),
  steps: z.array(z.object({ label: z.string(), persen: z.number().min(0).max(100), pemicu: z.string() }))
    .refine((arr) => arr.some((s) => s.label.trim() !== ""), { message: "Tambahkan minimal satu termin." }),
});
type TerminForm = z.infer<typeof terminFormSchema>;

function TerminStepsField({ value, onChange }: { value: TerminTemplateStep[]; onChange: (v: TerminTemplateStep[]) => void }) {
  return (
    <ArrayStepsEditor
      rows={value}
      onChange={onChange}
      makeEmpty={() => ({ label: "", persen: 0, pemicu: "" })}
      isEmpty={(r) => r.label.trim() === ""}
      renderRow={(row, i, update) => (
        <div className="grid grid-cols-[2fr_1fr_2fr] gap-2">
          <Input value={row.label} onChange={(e) => update({ label: e.target.value })} placeholder="Label termin…" className="text-sm" />
          <InputGroup>
            <InputGroupInput type="number" value={row.persen} onChange={(e) => update({ persen: Number(e.target.value) })} />
            <InputGroupAddon align="inline-end"><InputGroupText>%</InputGroupText></InputGroupAddon>
          </InputGroup>
          <Input value={row.pemicu} onChange={(e) => update({ pemicu: e.target.value })} placeholder="Pemicu…" className="text-sm" />
        </div>
      )}
    />
  );
}

function TerminForm_({
  initial, onSubmitTemplate, open, onOpenChange, title, submitLabel,
}: {
  initial: TerminForm;
  onSubmitTemplate: (values: TerminForm) => Promise<void>;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  submitLabel: string;
}) {
  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<TerminForm>({
    resolver: zodResolver(terminFormSchema),
    defaultValues: initial,
  });
  const steps = watch("steps");

  React.useEffect(() => { if (open) reset(initial); }, [open, initial, reset]);

  const hasStep = steps.some((s) => s.label.trim() !== "");
  const onSubmit = handleSubmit(async (values) => {
    await onSubmitTemplate({ ...values, steps: values.steps.filter((s) => s.label.trim() !== "") });
    onOpenChange(false);
  }, onFormInvalid);

  return (
    <FormSheet
      open={open}
      onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}
      title={title}
      onSubmit={onSubmit}
      submitLabel={submitLabel}
      submitDisabled={!hasStep}
    >
      <Field data-invalid={!!errors.nama}>
        <FieldLabel>Nama Template</FieldLabel>
        <Input {...register("nama")} />
        <FieldError errors={errors.nama ? [errors.nama] : undefined} />
      </Field>
      <Field data-invalid={!!errors.steps}>
        <FieldLabel>Skema Termin</FieldLabel>
        <TerminStepsField value={steps} onChange={(v) => setValue("steps", v, { shouldValidate: true })} />
        <FieldError errors={errors.steps?.message ? [{ message: errors.steps.message }] : undefined} />
      </Field>
    </FormSheet>
  );
}

function makeTerminColumns(
  onEdit: (t: TerminTemplate) => void,
  onDuplicate: (t: TerminTemplate) => void,
  onDelete: (t: TerminTemplate) => void,
): ColumnDef<TerminTemplate>[] {
  return [
    rowNumberColumn<TerminTemplate>(),
    {
      accessorKey: "nama", header: "Nama", enableSorting: false, meta: { className: "min-w-56" },
      cell: ({ row }) => (
        <button type="button" onClick={() => onEdit(row.original)} className="rounded-sm text-left font-medium hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
          {row.original.nama}
        </button>
      ),
    },
    { id: "jumlah", header: "Jumlah Termin", cell: ({ row }) => `${row.original.steps.length} termin` },
    {
      id: "actions", header: "", enableSorting: false, meta: { className: "w-10" },
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger className="outline-none"><MoreHorizontal className="size-4 text-muted-foreground" /></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => onEdit(row.original)}><Pencil className="size-3.5" /> Ubah</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onDuplicate(row.original)}><Plus className="size-3.5" /> Duplikasi</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onDelete(row.original)} className="text-destructive focus:text-destructive"><Trash2 className="size-3.5" /> Hapus</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];
}

function TerminSection() {
  const { data, isLoading } = useTerminTemplateList();
  const { mutateAsync: create } = useCreateTerminTemplate();
  const { mutateAsync: update } = useUpdateTerminTemplate();
  const { mutate: remove, isPending: isDeleting } = useDeleteTerminTemplate();
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<TerminTemplate | null>(null);
  const [duplicateSource, setDuplicateSource] = React.useState<TerminTemplate | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<TerminTemplate | null>(null);

  const columns = makeTerminColumns(setEditTarget, setDuplicateSource, setDeleteTarget);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="size-4" /> Tambah Template Termin</Button>
      </div>

      <TerminForm_
        key="create"
        initial={{ nama: "", steps: [{ label: "", persen: 0, pemicu: "" }] }}
        onSubmitTemplate={async (values) => { await create(values); }}
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Tambah Template Termin"
        submitLabel="Simpan"
      />

      {editTarget && (
        <TerminForm_
          key={`edit-${editTarget.id}`}
          initial={{ nama: editTarget.nama, steps: editTarget.steps }}
          onSubmitTemplate={async (values) => { await update({ id: editTarget.id, input: values }); }}
          open={!!editTarget}
          onOpenChange={(o) => { if (!o) setEditTarget(null); }}
          title="Ubah Template Termin"
          submitLabel="Simpan Perubahan"
        />
      )}

      {duplicateSource && (
        <TerminForm_
          key={`dup-${duplicateSource.id}`}
          initial={{ nama: `Salinan ${duplicateSource.nama}`, steps: duplicateSource.steps }}
          onSubmitTemplate={async (values) => { await create(values); }}
          open={!!duplicateSource}
          onOpenChange={(o) => { if (!o) setDuplicateSource(null); }}
          title="Duplikasi Template Termin"
          submitLabel="Duplikasi"
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Template?</AlertDialogTitle>
            <AlertDialogDescription><strong>{deleteTarget?.nama}</strong> akan dihapus permanen.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
              onClick={() => { if (!deleteTarget) return; remove(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) }); }}
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DataTable columns={columns} data={data ?? []} loading={isLoading} searchColumns={["nama"]} searchPlaceholder="Cari template…" emptyMessage="Belum ada template termin" rowActions={false} />
    </div>
  );
}

/* ══════════════════════════ PDF ══════════════════════════ */

const pdfFormSchema = z.object({
  nama: z.string().min(1, "Nama template wajib diisi."),
  documentType: z.enum(["sph", "invoice", "slip_gaji"]),
  headerNote: z.string(),
  footerNote: z.string(),
});
type PdfForm = z.infer<typeof pdfFormSchema>;

function PdfForm_({
  initial, onSubmitTemplate, open, onOpenChange, title, submitLabel,
}: {
  initial: PdfForm;
  onSubmitTemplate: (values: PdfForm) => Promise<void>;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  submitLabel: string;
}) {
  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<PdfForm>({
    resolver: zodResolver(pdfFormSchema),
    defaultValues: initial,
  });

  React.useEffect(() => { if (open) reset(initial); }, [open, initial, reset]);

  const onSubmit = handleSubmit(async (values) => {
    await onSubmitTemplate(values);
    onOpenChange(false);
  }, onFormInvalid);

  return (
    <FormSheet open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }} title={title} onSubmit={onSubmit} submitLabel={submitLabel}>
      <Field data-invalid={!!errors.nama}>
        <FieldLabel>Nama Template</FieldLabel>
        <Input {...register("nama")} />
        <FieldError errors={errors.nama ? [errors.nama] : undefined} />
      </Field>
      <Field>
        <FieldLabel>Jenis Dokumen</FieldLabel>
        <Controller
          control={control}
          name="documentType"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(DOC_TYPE_LABEL) as PdfTemplateDocumentType[]).map((k) => (
                  <SelectItem key={k} value={k}>{DOC_TYPE_LABEL[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </Field>
      <Field>
        <FieldLabel>Catatan Header</FieldLabel>
        <Textarea rows={3} {...register("headerNote")} />
      </Field>
      <Field>
        <FieldLabel>Catatan Footer</FieldLabel>
        <Textarea rows={3} {...register("footerNote")} />
      </Field>
    </FormSheet>
  );
}

function makePdfColumns(
  onEdit: (t: PdfTemplate) => void,
  onDuplicate: (t: PdfTemplate) => void,
  onDelete: (t: PdfTemplate) => void,
): ColumnDef<PdfTemplate>[] {
  return [
    rowNumberColumn<PdfTemplate>(),
    {
      accessorKey: "nama", header: "Nama", enableSorting: false, meta: { className: "min-w-56" },
      cell: ({ row }) => (
        <button type="button" onClick={() => onEdit(row.original)} className="rounded-sm text-left font-medium hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
          {row.original.nama}
        </button>
      ),
    },
    { accessorKey: "documentType", header: "Jenis Dokumen", cell: ({ row }) => DOC_TYPE_LABEL[row.original.documentType] },
    {
      id: "actions", header: "", enableSorting: false, meta: { className: "w-10" },
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger className="outline-none"><MoreHorizontal className="size-4 text-muted-foreground" /></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => onEdit(row.original)}><Pencil className="size-3.5" /> Ubah</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onDuplicate(row.original)}><Plus className="size-3.5" /> Duplikasi</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onDelete(row.original)} className="text-destructive focus:text-destructive"><Trash2 className="size-3.5" /> Hapus</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];
}

function PdfSection() {
  const { data, isLoading } = usePdfTemplateList();
  const { mutateAsync: create } = useCreatePdfTemplate();
  const { mutateAsync: update } = useUpdatePdfTemplate();
  const { mutate: remove, isPending: isDeleting } = useDeletePdfTemplate();
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<PdfTemplate | null>(null);
  const [duplicateSource, setDuplicateSource] = React.useState<PdfTemplate | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<PdfTemplate | null>(null);

  const columns = makePdfColumns(setEditTarget, setDuplicateSource, setDeleteTarget);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="size-4" /> Tambah Template PDF</Button>
      </div>

      <PdfForm_
        key="create"
        initial={{ nama: "", documentType: "sph", headerNote: "", footerNote: "" }}
        onSubmitTemplate={async (values) => { await create(values); }}
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Tambah Template PDF"
        submitLabel="Simpan"
      />

      {editTarget && (
        <PdfForm_
          key={`edit-${editTarget.id}`}
          initial={{ nama: editTarget.nama, documentType: editTarget.documentType, headerNote: editTarget.headerNote, footerNote: editTarget.footerNote }}
          onSubmitTemplate={async (values) => { await update({ id: editTarget.id, input: values }); }}
          open={!!editTarget}
          onOpenChange={(o) => { if (!o) setEditTarget(null); }}
          title="Ubah Template PDF"
          submitLabel="Simpan Perubahan"
        />
      )}

      {duplicateSource && (
        <PdfForm_
          key={`dup-${duplicateSource.id}`}
          initial={{ nama: `Salinan ${duplicateSource.nama}`, documentType: duplicateSource.documentType, headerNote: duplicateSource.headerNote, footerNote: duplicateSource.footerNote }}
          onSubmitTemplate={async (values) => { await create(values); }}
          open={!!duplicateSource}
          onOpenChange={(o) => { if (!o) setDuplicateSource(null); }}
          title="Duplikasi Template PDF"
          submitLabel="Duplikasi"
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Template?</AlertDialogTitle>
            <AlertDialogDescription><strong>{deleteTarget?.nama}</strong> akan dihapus permanen.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
              onClick={() => { if (!deleteTarget) return; remove(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) }); }}
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DataTable columns={columns} data={data ?? []} loading={isLoading} searchColumns={["nama"]} searchPlaceholder="Cari template…" emptyMessage="Belum ada template PDF" rowActions={false} />
    </div>
  );
}

/* ══════════════════════════ Tab shell ══════════════════════════ */

export function TemplateTab() {
  return (
    <Tabs defaultValue="milestone">
      <TabsList variant="line">
        <TabsTrigger value="milestone">Milestone</TabsTrigger>
        <TabsTrigger value="termin">Termin</TabsTrigger>
        <TabsTrigger value="pdf">PDF</TabsTrigger>
      </TabsList>
      <TabsContent value="milestone"><MilestoneSection /></TabsContent>
      <TabsContent value="termin"><TerminSection /></TabsContent>
      <TabsContent value="pdf"><PdfSection /></TabsContent>
    </Tabs>
  );
}
