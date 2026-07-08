"use client";
import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { ColumnDef } from "@tanstack/react-table";
import { Lock, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { DataTable } from "@/components/shared/data-table";
import { FormSheet } from "@/components/shared/form-sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel, FieldDescription } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { onFormInvalid } from "@/lib/form-toast";
import { rowNumberColumn } from "@/components/konfigurasi/row-number-column";
import {
  useKategoriArusKasList, useCreateKategoriArusKas, useDeleteKategoriArusKas, useSetSifatBeban,
} from "@/lib/query/expense-nature";
import type { CashflowCategoryRow, SifatBeban } from "@/lib/schemas/expense-nature";

/** HPP is intentionally excluded — it's never read by the P&L waterfall for Arus Kas
 * categories (HPP comes exclusively from Realisasi RAB), so offering it here would
 * let an admin pick an option that silently does nothing. */
const SIFAT_OPTIONS: { value: SifatBeban; label: string }[] = [
  { value: "operasional", label: "Operasional" },
  { value: "non_laba_rugi", label: "Non-Laba-Rugi" },
];

const SIFAT_LABEL: Record<SifatBeban, string> = {
  hpp: "HPP",
  operasional: "Operasional",
  non_laba_rugi: "Non-Laba-Rugi",
};

function makeColumns(
  onEditSifat: (row: CashflowCategoryRow) => void,
  onDelete: (row: CashflowCategoryRow) => void,
): ColumnDef<CashflowCategoryRow>[] {
  return [
    rowNumberColumn<CashflowCategoryRow>(),
    { accessorKey: "kategori", header: "Kategori", enableSorting: false, meta: { className: "min-w-40" } },
    {
      accessorKey: "sifat", header: "Sifat Beban", enableSorting: false, meta: { className: "text-center" },
      cell: ({ row }) => <Badge variant="info">{SIFAT_LABEL[row.original.sifat]}</Badge>,
    },
    {
      accessorKey: "locked", header: "Terkunci", enableSorting: false, meta: { className: "text-center" },
      cell: ({ row }) => row.original.locked
        ? <Badge variant="secondary"><Lock className="size-3" /> Terkunci</Badge>
        : <span className="text-xs text-muted-foreground">—</span>,
    },
    {
      id: "actions", header: "", enableSorting: false, meta: { className: "w-10" },
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger className="outline-none">
            <MoreHorizontal className="size-4 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => onEditSifat(row.original)}>
              <Pencil className="size-3.5" /> Ubah Sifat Beban
            </DropdownMenuItem>
            {!row.original.locked && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => onDelete(row.original)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="size-3.5" /> Hapus
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];
}

const createFormSchema = z.object({
  kategori: z.string().min(1, "Nama kategori wajib diisi."),
  sifat: z.enum(["operasional", "non_laba_rugi"]),
});
type CreateForm = z.input<typeof createFormSchema>;

function CreateForm({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { mutateAsync, isPending } = useCreateKategoriArusKas();
  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<CreateForm>({
    resolver: zodResolver(createFormSchema),
    defaultValues: { kategori: "", sifat: "operasional" },
  });

  const onSubmit = handleSubmit(async (values) => {
    await mutateAsync({ kategori: values.kategori, sifat: values.sifat });
    onOpenChange(false);
    reset();
  }, onFormInvalid);

  return (
    <FormSheet
      open={open}
      onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}
      title="Tambah Kategori Arus Kas"
      description="Kategori kustom untuk transaksi non-standar."
      onSubmit={onSubmit}
      submitLabel={isPending ? "Menyimpan…" : "Simpan"}
    >
      <Field>
        <FieldLabel>Nama Kategori</FieldLabel>
        <Input placeholder="Biaya Operasional" {...register("kategori")} />
        {errors.kategori && <FieldError>{errors.kategori.message}</FieldError>}
      </Field>
      <Field>
        <FieldLabel>Sifat Beban</FieldLabel>
        <Controller
          name="sifat"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SIFAT_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        <FieldDescription>HPP tidak berlaku untuk kategori Arus Kas — HPP dihitung dari Realisasi RAB per proyek.</FieldDescription>
      </Field>
    </FormSheet>
  );
}

function EditSifatDialog({
  row, onOpenChange,
}: {
  row: CashflowCategoryRow | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { mutate, isPending } = useSetSifatBeban();
  const [sifat, setSifat] = React.useState<SifatBeban>(row?.sifat ?? "operasional");

  React.useEffect(() => {
    if (row) setSifat(row.sifat);
  }, [row]);

  return (
    <Dialog open={!!row} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Ubah Sifat Beban — {row?.kategori}</DialogTitle>
        </DialogHeader>
        <Field>
          <FieldLabel>Sifat Beban</FieldLabel>
          <Select value={sifat} onValueChange={(v) => setSifat(v as SifatBeban)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SIFAT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldDescription>Kategori terkunci hanya dapat diubah sifat bebannya, bukan nama/dihapus.</FieldDescription>
        </Field>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button
            disabled={isPending}
            onClick={() => {
              if (!row) return;
              mutate({ id: row.id, sifat }, { onSuccess: () => onOpenChange(false) });
            }}
          >
            {isPending ? "Menyimpan…" : "Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function KategoriArusKasTab() {
  const { data, isLoading } = useKategoriArusKasList();
  const { mutate: deleteKategori, isPending: isDeleting } = useDeleteKategoriArusKas();
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<CashflowCategoryRow | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<CashflowCategoryRow | null>(null);

  const columns = makeColumns(setEditTarget, setDeleteTarget);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" /> Tambah Kategori
        </Button>
      </div>

      <CreateForm open={createOpen} onOpenChange={setCreateOpen} />
      <EditSifatDialog row={editTarget} onOpenChange={(o) => { if (!o) setEditTarget(null); }} />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Kategori?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteTarget?.kategori}</strong> akan dihapus permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
              onClick={() => {
                if (!deleteTarget) return;
                deleteKategori(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) });
              }}
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DataTable
        columns={columns}
        data={data ?? []}
        loading={isLoading}
        searchColumns={["kategori"]}
        searchPlaceholder="Cari kategori…"
        emptyMessage="Belum ada kategori"
        rowActions={false}
      />
    </div>
  );
}
