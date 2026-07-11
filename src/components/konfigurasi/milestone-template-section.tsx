"use client";
import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
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
import { onFormInvalid } from "@/lib/form-toast";
import { rowNumberColumn } from "@/components/konfigurasi/row-number-column";
import { ArrayStepsEditor } from "@/components/konfigurasi/array-steps-editor";
import {
  useMilestoneTemplateList, useCreateMilestoneTemplate, useUpdateMilestoneTemplate, useDeleteMilestoneTemplate,
} from "@/lib/query/milestone-templates";
import type { MilestoneTemplate, MilestoneTemplateStep } from "@/lib/schemas/milestone-templates";

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

export function MilestoneSection() {
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
