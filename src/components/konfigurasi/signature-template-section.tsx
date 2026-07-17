"use client";
import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { DataTable } from "@/components/shared/data-table";
import { FormSheet } from "@/components/shared/form-sheet";
import { SignaturePad } from "@/components/shared/signature-pad";
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
import { onFormInvalid } from "@/lib/form-toast";
import { rowNumberColumn } from "@/components/konfigurasi/row-number-column";
import {
  useSignatureTemplateList, useCreateSignatureTemplate, useUpdateSignatureTemplate, useDeleteSignatureTemplate,
} from "@/lib/query/signature-templates";
import type { SignatureTemplate } from "@/lib/schemas/signature-templates";

const signatureFormSchema = z.object({
  nama: z.string().min(1, "Nama wajib diisi."),
  signatureImage: z.string().min(1, "Tanda tangan wajib digambar."),
});
type SignatureForm = z.infer<typeof signatureFormSchema>;

function SignatureForm_({
  initial, onSubmitTemplate, open, onOpenChange, title, submitLabel,
}: {
  initial: SignatureForm;
  onSubmitTemplate: (values: SignatureForm) => Promise<void>;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  submitLabel: string;
}) {
  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<SignatureForm>({
    resolver: zodResolver(signatureFormSchema),
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
        <FieldLabel>Nama</FieldLabel>
        <Input {...register("nama")} placeholder="mis. Budi Santoso - Direktur" />
        <FieldError errors={errors.nama ? [errors.nama] : undefined} />
      </Field>
      <Field data-invalid={!!errors.signatureImage}>
        <FieldLabel>Tanda Tangan</FieldLabel>
        <Controller
          control={control}
          name="signatureImage"
          render={({ field }) => (
            <SignaturePad value={field.value} onChange={(dataUrl) => field.onChange(dataUrl ?? "")} />
          )}
        />
        <FieldError errors={errors.signatureImage ? [errors.signatureImage] : undefined} />
      </Field>
    </FormSheet>
  );
}

function makeSignatureColumns(
  onEdit: (t: SignatureTemplate) => void,
  onDelete: (t: SignatureTemplate) => void,
): ColumnDef<SignatureTemplate>[] {
  return [
    rowNumberColumn<SignatureTemplate>(),
    {
      accessorKey: "nama", header: "Nama", enableSorting: false, meta: { className: "min-w-56" },
      cell: ({ row }) => (
        <button type="button" onClick={() => onEdit(row.original)} className="rounded-sm text-left font-medium hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
          {row.original.nama}
        </button>
      ),
    },
    {
      id: "preview", header: "Pratinjau", enableSorting: false,
      cell: ({ row }) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={row.original.signatureImage} alt={`Tanda tangan ${row.original.nama}`} className="h-10 w-auto" />
      ),
    },
    {
      id: "actions", header: "", enableSorting: false, meta: { className: "w-10" },
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger className="outline-none"><MoreHorizontal className="size-4 text-muted-foreground" /></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => onEdit(row.original)}><Pencil className="size-3.5" /> Ubah</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onDelete(row.original)} className="text-destructive focus:text-destructive"><Trash2 className="size-3.5" /> Hapus</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];
}

export function SignatureTemplateSection() {
  const { data, isLoading } = useSignatureTemplateList();
  const { mutateAsync: create } = useCreateSignatureTemplate();
  const { mutateAsync: update } = useUpdateSignatureTemplate();
  const { mutate: remove, isPending: isDeleting } = useDeleteSignatureTemplate();
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<SignatureTemplate | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<SignatureTemplate | null>(null);

  const columns = makeSignatureColumns(setEditTarget, setDeleteTarget);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="size-4" /> Tambah Tanda Tangan</Button>
      </div>

      <SignatureForm_
        key="create"
        initial={{ nama: "", signatureImage: "" }}
        onSubmitTemplate={async (values) => { await create(values); }}
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Tambah Template Tanda Tangan"
        submitLabel="Simpan"
      />

      {editTarget && (
        <SignatureForm_
          key={`edit-${editTarget.id}`}
          initial={{ nama: editTarget.nama, signatureImage: editTarget.signatureImage }}
          onSubmitTemplate={async (values) => { await update({ id: editTarget.id, input: values }); }}
          open={!!editTarget}
          onOpenChange={(o) => { if (!o) setEditTarget(null); }}
          title="Ubah Template Tanda Tangan"
          submitLabel="Simpan Perubahan"
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Template?</AlertDialogTitle>
            <AlertDialogDescription><strong>{deleteTarget?.nama}</strong> akan dihapus permanen. Dokumen yang sudah memakainya akan kembali menampilkan ruang kosong untuk tanda tangan manual.</AlertDialogDescription>
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

      <DataTable columns={columns} data={data ?? []} loading={isLoading} searchColumns={["nama"]} searchPlaceholder="Cari nama…" emptyMessage="Belum ada template tanda tangan" rowActions={false} />
    </div>
  );
}
