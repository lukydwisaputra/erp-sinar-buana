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
import { onFormInvalid } from "@/lib/form-toast";
import { rowNumberColumn } from "@/components/konfigurasi/row-number-column";
import { ArrayStepsEditor } from "@/components/konfigurasi/array-steps-editor";
import {
  useTerminTemplateList, useCreateTerminTemplate, useUpdateTerminTemplate, useDeleteTerminTemplate,
} from "@/lib/query/termin-templates";
import type { TerminTemplate, TerminTemplateStep } from "@/lib/schemas/termin-templates";

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

export function TerminSection() {
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
