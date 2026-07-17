"use client";
import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { DataTable } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { formatRupiah } from "@/lib/format";
import { rowNumberColumn } from "@/components/konfigurasi/row-number-column";
import { RabEditor, rabRowsTotal, type Rab } from "@/components/shared/rab-jadwal-editor";
import {
  useRabTemplateList, useCreateRabTemplate, useUpdateRabTemplate, useDeleteRabTemplate,
} from "@/lib/query/rab-templates";
import type { RabTemplate } from "@/lib/schemas/rab-templates";

const EMPTY_RAB: Rab = { personil: [], langsung: [] };

function RabTemplateFormBody({
  initialNama, initialRab, onSubmitTemplate, onOpenChange, title, submitLabel,
}: {
  initialNama: string;
  initialRab: Rab;
  onSubmitTemplate: (nama: string, rab: Rab) => Promise<void>;
  onOpenChange: (o: boolean) => void;
  title: string;
  submitLabel: string;
}) {
  const [nama, setNama] = React.useState(initialNama);
  const [rab, setRab] = React.useState<Rab>(initialRab);
  const [submitting, setSubmitting] = React.useState(false);

  const hasRow = rab.personil.length + rab.langsung.length > 0;
  const canSubmit = nama.trim() !== "" && hasRow && !submitting;

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onSubmitTemplate(nama, rab);
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <DialogHeader className="border-b px-6 pt-6 pb-3">
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <Field className="mb-6 max-w-md">
          <FieldLabel>Nama Template</FieldLabel>
          <Input value={nama} onChange={(e) => setNama(e.target.value)} placeholder="RAB Standar 3 Bulan" />
        </Field>
        <RabEditor rab={rab} onChange={setRab} />
      </div>
      <DialogFooter className="border-t px-6 py-4">
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
        <Button type="button" disabled={!canSubmit} onClick={handleSubmit}>
          {submitting ? "Menyimpan…" : submitLabel}
        </Button>
      </DialogFooter>
    </>
  );
}

/** Mounts `RabTemplateFormBody` fresh only while the dialog is open, so its
 * local state re-initializes from `initial*` via a normal mount instead of an
 * effect-driven reset (avoids the set-state-in-effect footgun). */
function RabTemplateForm({
  initialNama, initialRab, onSubmitTemplate, open, onOpenChange, title, submitLabel,
}: {
  initialNama: string;
  initialRab: Rab;
  onSubmitTemplate: (nama: string, rab: Rab) => Promise<void>;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  submitLabel: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[80vw] h-[80vh] max-w-[80vw]! p-0 flex flex-col overflow-hidden">
        {open && (
          <RabTemplateFormBody
            initialNama={initialNama}
            initialRab={initialRab}
            onSubmitTemplate={onSubmitTemplate}
            onOpenChange={onOpenChange}
            title={title}
            submitLabel={submitLabel}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function makeRabColumns(
  onEdit: (t: RabTemplate) => void,
  onDuplicate: (t: RabTemplate) => void,
  onDelete: (t: RabTemplate) => void,
): ColumnDef<RabTemplate>[] {
  return [
    rowNumberColumn<RabTemplate>(),
    {
      accessorKey: "nama", header: "Nama", enableSorting: false, meta: { className: "min-w-56" },
      cell: ({ row }) => (
        <button type="button" onClick={() => onEdit(row.original)} className="rounded-sm text-left font-medium hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
          {row.original.nama}
        </button>
      ),
    },
    { id: "jumlah", header: "Jumlah Baris", cell: ({ row }) => `${row.original.personil.length + row.original.langsung.length} baris` },
    {
      id: "total", header: "Total RAB", meta: { className: "text-right" },
      cell: ({ row }) => formatRupiah(rabRowsTotal(row.original.personil) + rabRowsTotal(row.original.langsung)),
    },
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

export function RabTemplateSection() {
  const { data, isLoading } = useRabTemplateList();
  const { mutateAsync: create } = useCreateRabTemplate();
  const { mutateAsync: update } = useUpdateRabTemplate();
  const { mutate: remove, isPending: isDeleting } = useDeleteRabTemplate();
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<RabTemplate | null>(null);
  const [duplicateSource, setDuplicateSource] = React.useState<RabTemplate | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<RabTemplate | null>(null);

  const columns = makeRabColumns(setEditTarget, setDuplicateSource, setDeleteTarget);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="size-4" /> Tambah Template RAB</Button>
      </div>

      <RabTemplateForm
        key="create"
        initialNama=""
        initialRab={EMPTY_RAB}
        onSubmitTemplate={async (nama, rab) => { await create({ nama, personil: rab.personil, langsung: rab.langsung }); }}
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Tambah Template RAB"
        submitLabel="Simpan"
      />

      {editTarget && (
        <RabTemplateForm
          key={`edit-${editTarget.id}`}
          initialNama={editTarget.nama}
          initialRab={{ personil: editTarget.personil, langsung: editTarget.langsung }}
          onSubmitTemplate={async (nama, rab) => { await update({ id: editTarget.id, input: { nama, personil: rab.personil, langsung: rab.langsung } }); }}
          open={!!editTarget}
          onOpenChange={(o) => { if (!o) setEditTarget(null); }}
          title="Ubah Template RAB"
          submitLabel="Simpan Perubahan"
        />
      )}

      {duplicateSource && (
        <RabTemplateForm
          key={`dup-${duplicateSource.id}`}
          initialNama={`Salinan ${duplicateSource.nama}`}
          initialRab={{ personil: duplicateSource.personil, langsung: duplicateSource.langsung }}
          onSubmitTemplate={async (nama, rab) => { await create({ nama, personil: rab.personil, langsung: rab.langsung }); }}
          open={!!duplicateSource}
          onOpenChange={(o) => { if (!o) setDuplicateSource(null); }}
          title="Duplikasi Template RAB"
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

      <DataTable columns={columns} data={data ?? []} loading={isLoading} searchColumns={["nama"]} searchPlaceholder="Cari template…" emptyMessage="Belum ada template RAB" rowActions={false} />
    </div>
  );
}
