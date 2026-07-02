"use client";
import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { ColumnDef } from "@tanstack/react-table";
import { ChevronDown, ChevronUp, Copy, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { DataTable } from "@/components/shared/data-table";
import { FormSheet } from "@/components/shared/form-sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { onFormInvalid } from "@/lib/form-toast";
import { rowNumberColumn } from "@/components/konfigurasi/row-number-column";
import {
  useTemplateList, useCreateTemplate, useDeleteTemplate, useDuplicateTemplate, useMoveMilestoneStep,
} from "@/lib/query/template";
import type { Template, TemplateJenis } from "@/lib/schemas/template";

const JENIS_LABEL: Record<TemplateJenis, string> = {
  milestone: "Milestone",
  pdf: "PDF",
  termin: "Termin",
};

function TemplateDetail({ template }: { template: Template }) {
  const { mutate: moveStep } = useMoveMilestoneStep();
  const steps = [...template.milestoneSteps].sort((a, b) => a.urutan - b.urutan);

  if (template.jenis === "milestone") {
    return (
      <div className="space-y-1">
        {steps.map((s, i) => (
          <div key={s.nama} className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-1.5 text-sm">
            <span>{i + 1}. {s.nama}</span>
            <div className="flex gap-0.5">
              <Button variant="ghost" size="icon" className="size-6" onClick={() => moveStep({ templateId: template.id, index: i, direction: "up" })}>
                <ChevronUp className="size-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="size-6" onClick={() => moveStep({ templateId: template.id, index: i, direction: "down" })}>
                <ChevronDown className="size-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (template.jenis === "termin") {
    return (
      <div className="space-y-1">
        {template.terminSteps.map((s) => (
          <div key={s.label} className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-1.5 text-sm">
            <span>{s.label} — {s.pemicu}</span>
            <span className="font-mono font-medium">{s.persen}%</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2 text-sm">
      <div><p className="text-xs text-muted-foreground">Catatan Header</p><p>{template.pdfMeta?.headerNote || "—"}</p></div>
      <div><p className="text-xs text-muted-foreground">Catatan Footer</p><p>{template.pdfMeta?.footerNote || "—"}</p></div>
    </div>
  );
}

function makeColumns(
  onOpen: (t: Template) => void,
  onDuplicate: (t: Template) => void,
  onDelete: (t: Template) => void,
): ColumnDef<Template>[] {
  return [
    rowNumberColumn<Template>(),
    {
      accessorKey: "nama", header: "Nama", enableSorting: false, meta: { className: "min-w-56" },
      cell: ({ row }) => (
        <button type="button" onClick={() => onOpen(row.original)}
          className="rounded-sm text-left font-medium hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
          {row.original.nama}
        </button>
      ),
    },
    {
      accessorKey: "jenisLayananTerkait", header: "Layanan Terkait", enableSorting: false, meta: { className: "text-center" },
      cell: ({ row }) => row.original.jenisLayananTerkait ?? "—",
    },
    {
      accessorKey: "aktif", header: "Status", enableSorting: false, meta: { className: "text-center" },
      cell: ({ row }) => row.original.aktif ? <Badge variant="success">Aktif</Badge> : <Badge variant="secondary">Nonaktif</Badge>,
    },
    {
      id: "actions", header: "", enableSorting: false, meta: { className: "w-10" },
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger className="outline-none">
            <MoreHorizontal className="size-4 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => onDuplicate(row.original)}>
              <Copy className="size-3.5" /> Duplikasi
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onDelete(row.original)} className="text-destructive focus:text-destructive">
              <Trash2 className="size-3.5" /> Hapus
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];
}

const createFormSchema = z.object({
  nama: z.string().min(1, "Nama wajib diisi."),
});
type CreateForm = z.input<typeof createFormSchema>;

function CreateTemplateForm({
  jenis, open, onOpenChange,
}: {
  jenis: TemplateJenis;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { mutateAsync, isPending } = useCreateTemplate();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateForm>({
    resolver: zodResolver(createFormSchema),
    defaultValues: { nama: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    await mutateAsync({
      jenis, nama: values.nama, jenisLayananTerkait: null, aktif: true,
      milestoneSteps: [], terminSteps: [], pdfMeta: jenis === "pdf" ? { headerNote: "", footerNote: "" } : null,
    });
    onOpenChange(false);
    reset();
  }, onFormInvalid);

  return (
    <FormSheet
      open={open}
      onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}
      title={`Tambah Template ${JENIS_LABEL[jenis]}`}
      onSubmit={onSubmit}
      submitLabel={isPending ? "Menyimpan…" : "Simpan"}
    >
      <Field>
        <FieldLabel>Nama Template</FieldLabel>
        <Input {...register("nama")} />
        {errors.nama && <FieldError>{errors.nama.message}</FieldError>}
      </Field>
    </FormSheet>
  );
}

function DuplicateDialog({ template, onOpenChange }: { template: Template | null; onOpenChange: (open: boolean) => void }) {
  const { mutateAsync, isPending } = useDuplicateTemplate();
  const [nama, setNama] = React.useState("");

  React.useEffect(() => {
    if (template) setNama(`Salinan ${template.nama}`);
  }, [template]);

  return (
    <Dialog open={!!template} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Duplikasi Template</DialogTitle>
        </DialogHeader>
        <Field>
          <FieldLabel>Nama Template Baru</FieldLabel>
          <Input value={nama} onChange={(e) => setNama(e.target.value)} />
        </Field>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button
            disabled={isPending || !nama.trim()}
            onClick={async () => {
              if (!template) return;
              await mutateAsync({ id: template.id, namaBaru: nama.trim() });
              onOpenChange(false);
            }}
          >
            {isPending ? "Menyimpan…" : "Duplikasi"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function JenisSection({ jenis }: { jenis: TemplateJenis }) {
  const { data, isLoading } = useTemplateList(jenis);
  const { mutate: deleteTemplate, isPending: isDeleting } = useDeleteTemplate();
  const [createOpen, setCreateOpen] = React.useState(false);
  const [duplicateTarget, setDuplicateTarget] = React.useState<Template | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<Template | null>(null);
  const [expanded, setExpanded] = React.useState<Template | null>(null);

  const columns = makeColumns(setExpanded, setDuplicateTarget, setDeleteTarget);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" /> Tambah Template {JENIS_LABEL[jenis]}
        </Button>
      </div>

      <CreateTemplateForm jenis={jenis} open={createOpen} onOpenChange={setCreateOpen} />
      <DuplicateDialog template={duplicateTarget} onOpenChange={(o) => { if (!o) setDuplicateTarget(null); }} />

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
              onClick={() => {
                if (!deleteTarget) return;
                deleteTemplate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) });
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
        searchColumns={["nama"]}
        searchPlaceholder="Cari template…"
        emptyMessage="Belum ada template"
        rowActions={false}
      />

      <Dialog open={!!expanded} onOpenChange={(o) => { if (!o) setExpanded(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{expanded?.nama}</DialogTitle>
          </DialogHeader>
          {expanded && <TemplateDetail template={expanded} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function TemplateTab() {
  return (
    <Tabs defaultValue="milestone">
      <TabsList variant="line">
        <TabsTrigger value="milestone">Milestone</TabsTrigger>
        <TabsTrigger value="termin">Termin</TabsTrigger>
        <TabsTrigger value="pdf">PDF</TabsTrigger>
      </TabsList>
      <TabsContent value="milestone"><JenisSection jenis="milestone" /></TabsContent>
      <TabsContent value="termin"><JenisSection jenis="termin" /></TabsContent>
      <TabsContent value="pdf"><JenisSection jenis="pdf" /></TabsContent>
    </Tabs>
  );
}
