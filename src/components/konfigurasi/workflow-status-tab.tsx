"use client";
import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { ColumnDef } from "@tanstack/react-table";
import { Lock, MoreHorizontal, Pencil, Trash2, Plus } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { onFormInvalid } from "@/lib/form-toast";
import {
  useStatusDefinisiList, useCreateStatusDefinisi, useUpdateStatusLabel,
  useSetStatusRole, useDeleteStatusDefinisi,
} from "@/lib/query/status-definisi";
import { docTypeStatus, systemRole, type DocTypeStatus, type StatusDefinisi, type SystemRole } from "@/lib/schemas/status-definisi";

const DOC_TYPE_LABEL: Record<DocTypeStatus, string> = {
  penawaran: "Penawaran",
  proyek: "Proyek",
  milestone: "Milestone",
  faktur: "Faktur",
  penggajian: "Penggajian",
};

const ROLE_LABEL: Record<SystemRole, string> = {
  SELESAI: "Selesai",
  LUNAS: "Lunas",
  DIBAYAR: "Dibayar",
  BATAL: "Batal",
};

function makeColumns(
  onEditLabel: (row: StatusDefinisi) => void,
  onSetRole: (row: StatusDefinisi, role: SystemRole | null) => void,
  onDelete: (row: StatusDefinisi) => void,
): ColumnDef<StatusDefinisi>[] {
  return [
    { accessorKey: "label", header: "Label", meta: { className: "min-w-40" } },
    { accessorKey: "id", header: "ID", meta: { mono: true, className: "text-muted-foreground" } },
    {
      id: "role", header: "Peran Sistem", meta: { className: "min-w-40" },
      cell: ({ row }) => (
        <Select
          value={row.original.role ?? "none"}
          onValueChange={(v) => onSetRole(row.original, v === "none" ? null : (v as SystemRole))}
        >
          <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">—</SelectItem>
            {systemRole.options.map((r) => (
              <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
    },
    {
      accessorKey: "locked", header: "Terkunci", meta: { className: "text-center" },
      cell: ({ row }) => row.original.locked
        ? <Badge variant="secondary"><Lock className="size-3" /> Terkunci</Badge>
        : <span className="text-xs text-muted-foreground">—</span>,
    },
    {
      id: "actions", header: "", meta: { className: "w-10" },
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger className="outline-none">
            <MoreHorizontal className="size-4 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => onEditLabel(row.original)}>
              <Pencil className="size-3.5" /> Ubah Label
            </DropdownMenuItem>
            {!row.original.locked && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => onDelete(row.original)} className="text-destructive focus:text-destructive">
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

function EditLabelDialog({ row, onOpenChange }: { row: StatusDefinisi | null; onOpenChange: (open: boolean) => void }) {
  const { mutate, isPending } = useUpdateStatusLabel();
  const [label, setLabel] = React.useState("");

  React.useEffect(() => { if (row) setLabel(row.label); }, [row]);

  return (
    <Dialog open={!!row} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Ubah Label — {row?.id}</DialogTitle>
        </DialogHeader>
        <Field>
          <FieldLabel>Label</FieldLabel>
          <Input value={label} onChange={(e) => setLabel(e.target.value)} />
          <FieldDescription>ID internal ({row?.id}) tidak berubah — hanya teks yang ditampilkan.</FieldDescription>
        </Field>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button
            disabled={isPending || !label.trim()}
            onClick={() => {
              if (!row) return;
              mutate({ id: row.id, docType: row.docType, label: label.trim() }, { onSuccess: () => onOpenChange(false) });
            }}
          >
            {isPending ? "Menyimpan…" : "Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const createFormSchema = z.object({ label: z.string().min(1, "Label wajib diisi.") });
type CreateForm = z.input<typeof createFormSchema>;

function CreateStatusForm({ docType, open, onOpenChange }: { docType: DocTypeStatus; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { mutateAsync, isPending } = useCreateStatusDefinisi();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateForm>({
    resolver: zodResolver(createFormSchema),
    defaultValues: { label: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    await mutateAsync({ docType, label: values.label });
    onOpenChange(false);
    reset();
  }, onFormInvalid);

  return (
    <FormSheet
      open={open}
      onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}
      title="Tambah Status"
      description="Status baru berfungsi sebagai status biasa (tanpa otomasi) sampai diberi Peran Sistem."
      onSubmit={onSubmit}
      submitLabel={isPending ? "Menyimpan…" : "Simpan"}
    >
      <Field>
        <FieldLabel>Label</FieldLabel>
        <Input placeholder="mis. Review Klien" {...register("label")} />
        {errors.label && <FieldError>{errors.label.message}</FieldError>}
      </Field>
    </FormSheet>
  );
}

function DocTypeSection({ docType }: { docType: DocTypeStatus }) {
  const { data, isLoading } = useStatusDefinisiList(docType);
  const { mutate: setRole } = useSetStatusRole();
  const { mutate: deleteStatus, isPending: isDeleting } = useDeleteStatusDefinisi();
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<StatusDefinisi | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<StatusDefinisi | null>(null);

  const columns = makeColumns(
    setEditTarget,
    (row, role) => setRole({ id: row.id, docType, role }),
    setDeleteTarget,
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" /> Tambah Status
        </Button>
      </div>

      <CreateStatusForm docType={docType} open={createOpen} onOpenChange={setCreateOpen} />
      <EditLabelDialog row={editTarget} onOpenChange={(o) => { if (!o) setEditTarget(null); }} />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Status?</AlertDialogTitle>
            <AlertDialogDescription><strong>{deleteTarget?.label}</strong> akan dihapus permanen.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
              onClick={() => {
                if (!deleteTarget) return;
                deleteStatus({ id: deleteTarget.id, docType }, { onSuccess: () => setDeleteTarget(null) });
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
        searchColumns={["label"]}
        searchPlaceholder="Cari status…"
        emptyMessage="Belum ada status"
        rowActions={false}
      />
    </div>
  );
}

export function WorkflowStatusTab() {
  return (
    <Tabs defaultValue="penawaran">
      <TabsList variant="line">
        {docTypeStatus.options.map((dt) => (
          <TabsTrigger key={dt} value={dt}>{DOC_TYPE_LABEL[dt]}</TabsTrigger>
        ))}
      </TabsList>
      {docTypeStatus.options.map((dt) => (
        <TabsContent key={dt} value={dt}><DocTypeSection docType={dt} /></TabsContent>
      ))}
    </Tabs>
  );
}
