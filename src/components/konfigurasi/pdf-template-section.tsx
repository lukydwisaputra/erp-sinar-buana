"use client";
import * as React from "react";
import { useForm, Controller } from "react-hook-form";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { onFormInvalid } from "@/lib/form-toast";
import { rowNumberColumn } from "@/components/konfigurasi/row-number-column";
import {
  usePdfTemplateList, useCreatePdfTemplate, useUpdatePdfTemplate, useDeletePdfTemplate,
} from "@/lib/query/pdf-templates";
import type { PdfTemplate, PdfTemplateDocumentType } from "@/lib/schemas/pdf-templates";

const DOC_TYPE_LABEL: Record<PdfTemplateDocumentType, string> = {
  sph: "SPH",
  invoice: "Invoice",
  slip_gaji: "Slip Gaji",
};

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

export function PdfSection() {
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
