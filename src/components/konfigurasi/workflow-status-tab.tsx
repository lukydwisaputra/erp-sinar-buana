"use client";
import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, Lock, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { DataTable } from "@/components/shared/data-table";
import { FormSheet } from "@/components/shared/form-sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { onFormInvalid } from "@/lib/form-toast";
import { rowNumberColumn } from "@/components/konfigurasi/row-number-column";
import {
  useWorkflowStatusAdminList, useCreateWorkflowStatus, useUpdateWorkflowStatus,
  useDeleteWorkflowStatus, useMoveWorkflowStatus,
} from "@/lib/query/workflow-status-admin";
import {
  workflowStatusEntity, workflowStatusSystemRole,
  type WorkflowStatusEntityAdmin, type WorkflowStatusRow, type WorkflowStatusSystemRole,
} from "@/lib/schemas/workflow-status-admin";

const ENTITY_LABEL: Record<WorkflowStatusEntityAdmin, string> = {
  proyek: "Proyek",
  milestone: "Milestone",
  faktur: "Faktur",
  penggajian: "Penggajian",
};

const ROLE_LABEL: Record<WorkflowStatusSystemRole, string> = {
  SELESAI: "Selesai",
  LUNAS: "Lunas",
  DIBAYAR: "Dibayar",
  BATAL: "Batal",
};

function makeColumns(
  onEditLabel: (row: WorkflowStatusRow) => void,
  onSetRole: (row: WorkflowStatusRow, role: WorkflowStatusSystemRole | null) => void,
  onToggleAktif: (row: WorkflowStatusRow, isActive: boolean) => void,
  onMove: (row: WorkflowStatusRow, direction: "up" | "down") => void,
  onDelete: (row: WorkflowStatusRow) => void,
): ColumnDef<WorkflowStatusRow>[] {
  return [
    rowNumberColumn<WorkflowStatusRow>(),
    { accessorKey: "label", header: "Label", enableSorting: false, meta: { className: "min-w-40" } },
    {
      id: "role", header: "Peran Sistem", enableSorting: false, meta: { className: "min-w-40" },
      cell: ({ row }) => (
        <Select
          value={row.original.systemRole ?? "none"}
          onValueChange={(v) => onSetRole(row.original, v === "none" ? null : (v as WorkflowStatusSystemRole))}
        >
          <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">—</SelectItem>
            {workflowStatusSystemRole.options.map((r) => (
              <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
    },
    {
      id: "aktif", header: "Aktif", enableSorting: false, meta: { className: "text-center" },
      cell: ({ row }) => (
        <Checkbox
          checked={row.original.isActive}
          disabled={row.original.isDefault}
          onCheckedChange={(checked) => onToggleAktif(row.original, checked === true)}
        />
      ),
    },
    {
      accessorKey: "isSystem", header: "Sistem", enableSorting: false, meta: { className: "text-center" },
      cell: ({ row }) => row.original.isSystem
        ? <Badge variant="secondary"><Lock className="size-3" /> Sistem</Badge>
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
            <DropdownMenuItem onSelect={() => onEditLabel(row.original)}>
              <Pencil className="size-3.5" /> Ubah Label
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onMove(row.original, "up")}>
              <ArrowUp className="size-3.5" /> Pindah ke Atas
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onMove(row.original, "down")}>
              <ArrowDown className="size-3.5" /> Pindah ke Bawah
            </DropdownMenuItem>
            {!row.original.isSystem && (
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

function EditLabelDialog({ row, onOpenChange }: { row: WorkflowStatusRow | null; onOpenChange: (open: boolean) => void }) {
  const { mutate, isPending } = useUpdateWorkflowStatus();
  const [label, setLabel] = React.useState("");

  React.useEffect(() => { if (row) setLabel(row.label); }, [row]);

  return (
    <Dialog open={!!row} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Ubah Label</DialogTitle>
        </DialogHeader>
        <Field>
          <FieldLabel>Label</FieldLabel>
          <Input value={label} onChange={(e) => setLabel(e.target.value)} />
        </Field>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button
            disabled={isPending || !label.trim()}
            onClick={() => {
              if (!row) return;
              mutate({ id: row.id, input: { label: label.trim() } }, { onSuccess: () => onOpenChange(false) });
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

function CreateStatusForm({
  entity, open, onOpenChange,
}: {
  entity: WorkflowStatusEntityAdmin;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { mutateAsync, isPending } = useCreateWorkflowStatus();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateForm>({
    resolver: zodResolver(createFormSchema),
    defaultValues: { label: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    await mutateAsync({ entity, label: values.label });
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

function EntitySection({ entity }: { entity: WorkflowStatusEntityAdmin }) {
  const { data, isLoading } = useWorkflowStatusAdminList(entity);
  const { mutate: updateStatus } = useUpdateWorkflowStatus();
  const { mutate: moveStatus } = useMoveWorkflowStatus();
  const { mutate: deleteStatus, isPending: isDeleting } = useDeleteWorkflowStatus();
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<WorkflowStatusRow | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<WorkflowStatusRow | null>(null);

  const columns = makeColumns(
    setEditTarget,
    (row, role) => updateStatus({ id: row.id, input: { systemRole: role } }),
    (row, isActive) => updateStatus({ id: row.id, input: { isActive } }),
    (row, direction) => moveStatus({ id: row.id, direction, entity }),
    setDeleteTarget,
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" /> Tambah Status
        </Button>
      </div>

      <CreateStatusForm entity={entity} open={createOpen} onOpenChange={setCreateOpen} />
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
                deleteStatus({ id: deleteTarget.id, entity }, { onSuccess: () => setDeleteTarget(null) });
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
    <div className="space-y-3">
      <Tabs defaultValue="proyek">
        <TabsList variant="line">
          {workflowStatusEntity.options.map((e) => (
            <TabsTrigger key={e} value={e}>{ENTITY_LABEL[e]}</TabsTrigger>
          ))}
        </TabsList>
        {workflowStatusEntity.options.map((e) => (
          <TabsContent key={e} value={e}><EntitySection entity={e} /></TabsContent>
        ))}
      </Tabs>
      <FieldDescription>
        Status Penawaran mengikuti alur bawaan aplikasi (Draft → Terkirim → Disetujui/Ditolak/Batal) dan tidak dikelola di sini.
      </FieldDescription>
    </div>
  );
}
