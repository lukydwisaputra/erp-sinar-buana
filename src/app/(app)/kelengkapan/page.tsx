"use client";
import * as React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { ColumnDef } from "@tanstack/react-table";
import { ClipboardList, GripVertical, MoreHorizontal, Pencil, Plus, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { DataTable } from "@/components/shared/data-table";
import { ErrorState } from "@/components/shared/error-state";
import { FormSheet } from "@/components/shared/form-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useKelengkapanList, useCreateKelengkapan, useUpdateKelengkapan, useDeleteKelengkapan } from "@/lib/query/kelengkapan";
import { onFormInvalid } from "@/lib/form-toast";
import type { KelengkapanTemplate } from "@/lib/schemas/kelengkapan";

/* ---------- columns ---------- */

function makeColumns(
  onNavigate: (t: KelengkapanTemplate) => void,
  onEdit: (t: KelengkapanTemplate) => void,
  onDelete: (t: KelengkapanTemplate) => void,
): ColumnDef<KelengkapanTemplate>[] {
  return [
    {
      accessorKey: "id", header: "ID", meta: { mono: true },
      cell: ({ row }) => (
        <button type="button" onClick={() => onNavigate(row.original)}
          className="rounded-sm font-mono text-[var(--link)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {row.original.id}
        </button>
      ),
    },
    {
      accessorKey: "nama", header: "Nama Template", meta: { className: "min-w-72" },
      cell: ({ row }) => (
        <button type="button" onClick={() => onNavigate(row.original)}
          className="rounded-sm text-left font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {row.original.nama}
        </button>
      ),
    },
    {
      id: "jumlahItem", header: "Jumlah Persyaratan",
      accessorFn: (row) => row.items.length,
      cell: ({ row }) => `${row.original.items.length} item`,
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

/* ---------- form schema + item editor ---------- */

const templateFormSchema = z.object({
  nama: z.string().min(1, "Nama template wajib diisi."),
  // Per-item emptiness isn't an error (empty rows auto-removed on blur); we only
  // require at least one non-empty persyaratan — enforced by disabling submit.
  items: z.array(z.object({ persyaratan: z.string() }))
    .refine((arr) => arr.some((it) => it.persyaratan.trim() !== ""), {
      message: "Tambahkan minimal satu persyaratan.",
    }),
});
type TemplateForm = z.infer<typeof templateFormSchema>;

function ItemsEditor({
  items,
  onChange,
}: {
  items: { persyaratan: string }[];
  onChange: (items: { persyaratan: string }[]) => void;
}) {
  const [dragIdx, setDragIdx] = React.useState<number | null>(null);
  const [overIdx, setOverIdx] = React.useState<number | null>(null);
  const inputsRef = React.useRef<(HTMLInputElement | null)[]>([]);

  const add = () => {
    const newIdx = items.length;
    onChange([...items, { persyaratan: "" }]);
    // Focus the freshly-added row once it mounts.
    requestAnimationFrame(() => inputsRef.current[newIdx]?.focus());
  };
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const update = (i: number, val: string) =>
    onChange(items.map((it, idx) => (idx === i ? { persyaratan: val } : it)));

  // Drop a row when it loses focus while empty (but never the last remaining one).
  const handleBlur = (i: number) => {
    if (items.length > 1 && items[i].persyaratan.trim() === "") remove(i);
  };

  const move = (from: number, to: number) => {
    if (from === to || to < 0 || to >= items.length) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  };

  const resetDrag = () => { setDragIdx(null); setOverIdx(null); };

  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div
          key={i}
          onDragOver={(e) => { e.preventDefault(); if (dragIdx !== null && overIdx !== i) setOverIdx(i); }}
          onDrop={(e) => { e.preventDefault(); if (dragIdx !== null) move(dragIdx, i); resetDrag(); }}
          className={cn(
            "flex items-center gap-2 rounded-md transition-colors",
            dragIdx === i && "opacity-40",
            overIdx === i && dragIdx !== null && dragIdx !== i && "ring-1 ring-primary/50",
          )}
        >
          <span
            draggable
            onDragStart={(e) => { setDragIdx(i); e.dataTransfer.effectAllowed = "move"; }}
            onDragEnd={resetDrag}
            className="shrink-0 cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
            aria-label="Seret untuk mengurutkan"
          >
            <GripVertical className="size-4" />
          </span>
          <span className="w-5 shrink-0 text-xs text-muted-foreground">
            {String.fromCharCode(97 + i)}.
          </span>
          <Input
            ref={(el) => { inputsRef.current[i] = el; }}
            value={it.persyaratan}
            onChange={(e) => update(i, e.target.value)}
            onBlur={() => handleBlur(i)}
            placeholder="Uraian persyaratan…"
            className="flex-1 text-sm"
          />
          <Button type="button" variant="ghost" size="icon" className="size-7 shrink-0" onClick={() => remove(i)}>
            <X className="size-3.5" />
          </Button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-border py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:bg-muted/40 hover:text-foreground"
      >
        <Plus className="size-3.5" /> Tambah Persyaratan
      </button>
    </div>
  );
}

/* ---------- create form ---------- */

function TemplateCreateForm({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { mutateAsync, isPending } = useCreateKelengkapan();
  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<TemplateForm>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: { nama: "", items: [{ persyaratan: "" }] },
  });
  const items = watch("items");
  const hasItem = items.some((it) => it.persyaratan.trim() !== "");

  const onSubmit = handleSubmit(async (values) => {
    const cleaned = values.items.filter((it) => it.persyaratan.trim() !== "");
    await mutateAsync({ ...values, items: cleaned });
    onOpenChange(false);
    reset();
  }, onFormInvalid);

  return (
    <FormSheet
      open={open}
      onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}
      title="Tambah Template"
      description="Buat template kelengkapan administrasi baru."
      onSubmit={onSubmit}
      submitLabel={isPending ? "Menyimpan…" : "Simpan"}
      submitDisabled={!hasItem}
    >
      <Field data-invalid={!!errors.nama}>
        <FieldLabel htmlFor="c-nama">Nama Template</FieldLabel>
        <Input id="c-nama" placeholder="Kelengkapan Administrasi UKL-UPL" {...register("nama")} />
        <FieldError errors={errors.nama ? [errors.nama] : undefined} />
      </Field>

      <Field data-invalid={!!errors.items}>
        <FieldLabel>Daftar Persyaratan</FieldLabel>
        <ItemsEditor items={items} onChange={(v) => setValue("items", v, { shouldValidate: true })} />
        <FieldError errors={errors.items?.message ? [{ message: errors.items.message }] : undefined} />
      </Field>
    </FormSheet>
  );
}

/* ---------- edit form ---------- */

function TemplateEditForm({
  template,
  open,
  onOpenChange,
}: {
  template: KelengkapanTemplate;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { mutateAsync, isPending } = useUpdateKelengkapan();
  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<TemplateForm>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: { nama: template.nama, items: template.items },
  });
  const items = watch("items");

  React.useEffect(() => {
    if (open) reset({ nama: template.nama, items: template.items });
  }, [open, template, reset]);

  const hasItem = items.some((it) => it.persyaratan.trim() !== "");

  const onSubmit = handleSubmit(async (values) => {
    const cleaned = values.items.filter((it) => it.persyaratan.trim() !== "");
    await mutateAsync({ id: template.id, input: { ...values, items: cleaned } });
    onOpenChange(false);
  }, onFormInvalid);

  return (
    <FormSheet
      open={open}
      onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}
      title="Ubah Template"
      description={`Perbarui template ${template.id}.`}
      onSubmit={onSubmit}
      submitLabel={isPending ? "Menyimpan…" : "Simpan Perubahan"}
      submitDisabled={!hasItem}
    >
      <Field data-invalid={!!errors.nama}>
        <FieldLabel htmlFor="e-nama">Nama Template</FieldLabel>
        <Input id="e-nama" {...register("nama")} />
        <FieldError errors={errors.nama ? [errors.nama] : undefined} />
      </Field>

      <Field data-invalid={!!errors.items}>
        <FieldLabel>Daftar Persyaratan</FieldLabel>
        <ItemsEditor items={items} onChange={(v) => setValue("items", v, { shouldValidate: true })} />
        <FieldError errors={errors.items?.message ? [{ message: errors.items.message }] : undefined} />
      </Field>
    </FormSheet>
  );
}

/* ---------- page ---------- */

export default function KelengkapanPage() {
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useKelengkapanList();
  const { mutate: deleteTemplate, isPending: isDeleting } = useDeleteKelengkapan();

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<KelengkapanTemplate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<KelengkapanTemplate | null>(null);

  const columns = makeColumns(
    (t) => router.push(`/kelengkapan/${encodeURIComponent(t.id)}`),
    setEditTarget,
    setDeleteTarget,
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ClipboardList className="size-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold tracking-tight">Kelengkapan Administrasi</h1>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" /> Tambah Template
        </Button>
      </div>

      <TemplateCreateForm open={createOpen} onOpenChange={setCreateOpen} />

      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <DataTable
          columns={columns}
          data={data ?? []}
          loading={isLoading}
          searchColumns={["id", "nama"]}
          searchPlaceholder="Cari ID atau nama template…"
          emptyMessage="Belum ada template kelengkapan"
          defaultSorting={[{ id: "id", desc: true }]}
          rowActions={false}
        />
      )}

      {editTarget && (
        <TemplateEditForm
          template={editTarget}
          open={!!editTarget}
          onOpenChange={(o) => { if (!o) setEditTarget(null); }}
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Template?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteTarget?.nama}</strong> akan dihapus permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
              onClick={() => {
                if (!deleteTarget) return;
                deleteTemplate(deleteTarget.id, {
                  onSuccess: () => setDeleteTarget(null),
                });
              }}
            >
              {isDeleting ? "Menghapus…" : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
