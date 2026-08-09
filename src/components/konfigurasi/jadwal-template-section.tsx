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
import { rowNumberColumn } from "@/components/konfigurasi/row-number-column";
import { JadwalEditor, type Jadwal } from "@/components/shared/rab-jadwal-editor";
import {
  useJadwalTemplateList, useCreateJadwalTemplate, useUpdateJadwalTemplate, useDeleteJadwalTemplate,
} from "@/lib/query/jadwal-templates";
import type { JadwalTemplate } from "@/lib/schemas/jadwal-templates";

const EMPTY_JADWAL: Jadwal = { kegiatan: [], highlights: [], bulan: 1 };

function JadwalTemplateFormBody({
  initialNama, initialJadwal, onSubmitTemplate, onOpenChange, title, submitLabel,
}: {
  initialNama: string;
  initialJadwal: Jadwal;
  onSubmitTemplate: (nama: string, jadwal: Jadwal) => Promise<void>;
  onOpenChange: (o: boolean) => void;
  title: string;
  submitLabel: string;
}) {
  const [nama, setNama] = React.useState(initialNama);
  const [jadwal, setJadwal] = React.useState<Jadwal>(initialJadwal);
  const [submitting, setSubmitting] = React.useState(false);

  const canSubmit = nama.trim() !== "" && jadwal.kegiatan.length > 0 && !submitting;

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onSubmitTemplate(nama, jadwal);
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
          <Input value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Jadwal Standar 3 Bulan" />
        </Field>
        <JadwalEditor jadwal={jadwal} onChange={setJadwal} />
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

/** Mounts `JadwalTemplateFormBody` fresh only while the dialog is open, so
 * its local state re-initializes from `initial*` via a normal mount instead
 * of an effect-driven reset (avoids the set-state-in-effect footgun). */
function JadwalTemplateForm({
  initialNama, initialJadwal, onSubmitTemplate, open, onOpenChange, title, submitLabel,
}: {
  initialNama: string;
  initialJadwal: Jadwal;
  onSubmitTemplate: (nama: string, jadwal: Jadwal) => Promise<void>;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  submitLabel: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[80vw] h-[80vh] max-w-[80vw]! p-0 flex flex-col overflow-hidden">
        {open && (
          <JadwalTemplateFormBody
            initialNama={initialNama}
            initialJadwal={initialJadwal}
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

function makeJadwalColumns(
  onEdit: (t: JadwalTemplate) => void,
  onDuplicate: (t: JadwalTemplate) => void,
  onDelete: (t: JadwalTemplate) => void,
): ColumnDef<JadwalTemplate>[] {
  return [
    rowNumberColumn<JadwalTemplate>(),
    {
      accessorKey: "nama", header: "Nama", enableSorting: false, meta: { className: "min-w-56" },
      cell: ({ row }) => (
        <button type="button" onClick={() => onEdit(row.original)} className="rounded-sm text-left font-medium hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
          {row.original.nama}
        </button>
      ),
    },
    { id: "jumlah", header: "Jumlah Kegiatan", cell: ({ row }) => `${row.original.kegiatan.length} kegiatan` },
    { id: "bulan", header: "Jumlah Bulan", cell: ({ row }) => `${row.original.bulan} bulan` },
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

export function JadwalTemplateSection() {
  const { data, isLoading } = useJadwalTemplateList();
  const { mutateAsync: create } = useCreateJadwalTemplate();
  const { mutateAsync: update } = useUpdateJadwalTemplate();
  const { mutate: remove, isPending: isDeleting } = useDeleteJadwalTemplate();
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<JadwalTemplate | null>(null);
  const [duplicateSource, setDuplicateSource] = React.useState<JadwalTemplate | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<JadwalTemplate | null>(null);

  const columns = makeJadwalColumns(setEditTarget, setDuplicateSource, setDeleteTarget);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="size-4" /> Tambah Template Jadwal</Button>
      </div>

      <JadwalTemplateForm
        key="create"
        initialNama=""
        initialJadwal={EMPTY_JADWAL}
        onSubmitTemplate={async (nama, jadwal) => { await create({ nama, kegiatan: jadwal.kegiatan, highlights: jadwal.highlights, bulan: jadwal.bulan }); }}
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Tambah Template Jadwal"
        submitLabel="Simpan"
      />

      {editTarget && (
        <JadwalTemplateForm
          key={`edit-${editTarget.id}`}
          initialNama={editTarget.nama}
          initialJadwal={{ kegiatan: editTarget.kegiatan, highlights: editTarget.highlights, bulan: editTarget.bulan }}
          onSubmitTemplate={async (nama, jadwal) => { await update({ id: editTarget.id, input: { nama, kegiatan: jadwal.kegiatan, highlights: jadwal.highlights, bulan: jadwal.bulan } }); }}
          open={!!editTarget}
          onOpenChange={(o) => { if (!o) setEditTarget(null); }}
          title="Ubah Template Jadwal"
          submitLabel="Simpan Perubahan"
        />
      )}

      {duplicateSource && (
        <JadwalTemplateForm
          key={`dup-${duplicateSource.id}`}
          initialNama={`Salinan ${duplicateSource.nama}`}
          initialJadwal={{ kegiatan: duplicateSource.kegiatan, highlights: duplicateSource.highlights, bulan: duplicateSource.bulan }}
          onSubmitTemplate={async (nama, jadwal) => { await create({ nama, kegiatan: jadwal.kegiatan, highlights: jadwal.highlights, bulan: jadwal.bulan }); }}
          open={!!duplicateSource}
          onOpenChange={(o) => { if (!o) setDuplicateSource(null); }}
          title="Duplikasi Template Jadwal"
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

      <DataTable columns={columns} data={data ?? []} loading={isLoading} searchColumns={["nama"]} searchPlaceholder="Cari template…" emptyMessage="Belum ada template jadwal" rowActions={false} />
    </div>
  );
}
