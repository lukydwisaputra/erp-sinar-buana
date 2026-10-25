"use client";
import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Pencil, Plus, Trash2, Upload } from "lucide-react";
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
  signatureImage: z.string().min(1, "Gambar tanda tangan atau unggah gambar cap."),
});
type SignatureForm = z.infer<typeof signatureFormSchema>;

const UPLOAD_ACCEPT = ["image/png", "image/jpeg", "image/webp"];
const UPLOAD_MAX_BYTES = 1024 * 1024; // 1MB — stored inline as a data URI
// SignaturePad always exports a PNG of exactly this size, so any other
// dimensions on an existing template mean it was an uploaded cap image.
const PAD_WIDTH = 480;
const PAD_HEIGHT = 160;

/** Either draw a signature, or upload a cap image that already contains the
 * signature — the chosen image is stored as-is in `signatureImage`. */
function SignatureInput({ value, onChange }: { value: string; onChange: (dataUrl: string) => void }) {
  const [mode, setMode] = React.useState<"draw" | "upload">("draw");
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Editing an existing template: detect whether it was drawn or uploaded.
  React.useEffect(() => {
    if (!value) return;
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth !== PAD_WIDTH || img.naturalHeight !== PAD_HEIGHT) setMode("upload");
    };
    img.src = value;
    // Only on mount — later changes come from this component itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const switchMode = (next: "draw" | "upload") => {
    if (next === mode) return;
    setMode(next);
    setError(null);
    onChange("");
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!UPLOAD_ACCEPT.includes(file.type)) { setError("Format harus PNG, JPG, atau WebP."); return; }
    if (file.size > UPLOAD_MAX_BYTES) { setError("Ukuran gambar maksimal 1MB."); return; }
    const reader = new FileReader();
    reader.onload = () => { setError(null); onChange(reader.result as string); };
    reader.onerror = () => setError("Gagal membaca gambar.");
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button type="button" size="sm" variant={mode === "draw" ? "default" : "outline"} onClick={() => switchMode("draw")}>Gambar Tanda Tangan</Button>
        <Button type="button" size="sm" variant={mode === "upload" ? "default" : "outline"} onClick={() => switchMode("upload")}>Unggah Gambar Cap</Button>
      </div>
      {mode === "draw" ? (
        <SignaturePad value={value} onChange={(dataUrl) => onChange(dataUrl ?? "")} />
      ) : (
        <div className="space-y-2">
          <input ref={inputRef} type="file" accept={UPLOAD_ACCEPT.join(",")} className="hidden" onChange={handleFile} />
          {value && (
            <div className="flex h-40 items-center justify-center rounded-md border border-input bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={value} alt="Gambar cap" className="max-h-36 w-auto" />
            </div>
          )}
          <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
            <Upload className="size-4" /> {value ? "Ganti Gambar" : "Pilih Gambar"}
          </Button>
          <p className="text-xs text-muted-foreground">Gambar cap yang sudah memuat tanda tangan. PNG/JPG/WebP maks. 1MB, PNG berlatar transparan paling baik.</p>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      )}
    </div>
  );
}

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
          render={({ field }) => <SignatureInput value={field.value} onChange={field.onChange} />}
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
