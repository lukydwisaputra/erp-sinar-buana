"use client";
import * as React from "react";
import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Building2, FileText, FolderKanban, MoreHorizontal, Pencil, Plus, Receipt, SlidersHorizontal, Trash2, Wallet, X } from "lucide-react";
import { DataTable } from "@/components/shared/data-table";
import { ErrorState } from "@/components/shared/error-state";
import { FormSheet } from "@/components/shared/form-sheet";
import { MultiSelectFilter, type MultiSelectOption } from "@/components/shared/multi-select-filter";
import { NpwpField, PhoneField, EmailField } from "@/components/shared/form-fields";
import { StatTile, InfoRow, InfoList, SectionLabel, ContactCard, initials } from "@/components/shared/detail-drawer";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { StatusBadge, type StatusBadgeConfig } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatRupiah, formatRupiahCompact } from "@/lib/format";
import {
  usePerusahaanList, useCreatePerusahaan, useUpdatePerusahaan, useDeletePerusahaan,
} from "@/lib/query/perusahaan";
import { onFormInvalid } from "@/lib/form-toast";
import type { Perusahaan } from "@/lib/schemas/perusahaan";

const STATUS_BADGE: Record<Perusahaan["status"], StatusBadgeConfig> = {
  aktif: { label: "Aktif", variant: "success" },
  nonaktif: { label: "Nonaktif", variant: "secondary" },
};

const STATUS_OPTIONS: MultiSelectOption[] = Object.entries(STATUS_BADGE).map(([value, m]) => ({
  value, label: m.label, variant: m.variant,
}));

function makeColumns(
  onOpen: (p: Perusahaan) => void,
  onEdit: (p: Perusahaan) => void,
  onDelete: (p: Perusahaan) => void,
): ColumnDef<Perusahaan>[] {
  return [
    {
      accessorKey: "number",
      header: "No. Perusahaan",
      meta: { mono: true },
      cell: ({ row }) => (
        <button
          type="button"
          onClick={() => onOpen(row.original)}
          className="rounded-sm font-mono text-(--link) hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {row.original.number ?? "—"}
        </button>
      ),
    },
    {
      accessorKey: "nama",
      header: "Nama Perusahaan",
      meta: { className: "min-w-64" },
      cell: ({ row }) => (
        <button
          type="button"
          onClick={() => onOpen(row.original)}
          className="rounded-sm text-left font-medium hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {row.original.nama}
        </button>
      ),
    },
    {
      id: "pic",
      header: "PIC",
      accessorFn: (row) => row.pic[0]?.nama ?? "",
      cell: ({ row }) => {
        const pics = row.original.pic;
        if (pics.length === 0) return <span className="text-muted-foreground">—</span>;
        return (
          <TooltipProvider>
            <div className="flex">
              {pics.map((pic, i) => (
                <Tooltip key={i}>
                  <TooltipTrigger asChild>
                    <Avatar
                      className="size-7 cursor-default ring-2 ring-background"
                      style={{ marginLeft: i === 0 ? 0 : "-8px" }}
                    >
                      <AvatarFallback className="text-[10px]">{initials(pic.nama)}</AvatarFallback>
                    </Avatar>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <span className="font-medium">{pic.nama}</span>
                    <span className="ml-1 text-background/60">· {pic.jabatan}</span>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </TooltipProvider>
        );
      },
    },
    { accessorKey: "kota", header: "Kota" },
    {
      accessorKey: "status",
      header: "Status",
      meta: { className: "text-center" },
      cell: ({ row }) => <StatusBadge status={row.original.status} map={STATUS_BADGE} />,
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

/* ---------- detail drawer ---------- */

function PerusahaanDetail({ p }: { p: Perusahaan }) {
  const m = p.metrik;
  return (
    <div className="space-y-6 px-4 pb-8">
      <section>
        <SectionLabel>Ringkasan</SectionLabel>
        <div className="grid grid-cols-2 gap-2">
          <StatTile label="Penawaran" value={String(m.jumlahPenawaran)} icon={FileText} />
          <StatTile label="Proyek Aktif" value={String(m.proyekAktif)} icon={FolderKanban} />
          <StatTile label="Nilai Kontrak" value={formatRupiahCompact(m.nilaiKontrak)} title={formatRupiah(m.nilaiKontrak)} icon={Wallet} mono />
          <StatTile label="Piutang" value={formatRupiahCompact(m.piutang)} title={formatRupiah(m.piutang)} icon={Receipt} mono />
        </div>
      </section>

      <section>
        <SectionLabel>Kontak PIC ({p.pic.length})</SectionLabel>
        <div className="grid gap-2">
          {p.pic.map((pic) => (
            <ContactCard key={pic.email} name={pic.nama} role={pic.jabatan} phone={pic.telepon} email={pic.email} />
          ))}
        </div>
      </section>

      <section>
        <SectionLabel>Informasi Perusahaan</SectionLabel>
        <InfoList>
          <InfoRow label="NPWP" value={<span className="font-mono">{p.npwp}</span>} />
          <InfoRow label="Alamat" value={p.alamat} />
          <InfoRow label="Kota" value={p.kota} />
          <InfoRow label="Kabupaten" value={p.kabupaten} />
          {p.email && (
            <InfoRow label="Email" value={<a href={`mailto:${p.email}`} className="text-(--link) hover:underline">{p.email}</a>} />
          )}
        </InfoList>
      </section>
    </div>
  );
}

/* ---------- shared form schema ---------- */

const picSchema = z.object({
  nama: z.string().min(1, "Nama PIC wajib."),
  jabatan: z.string(),
  telepon: z.string().min(1, "Nomor HP wajib."),
  email: z.union([z.literal(""), z.string().email("Format email tidak valid.")]),
});

const perusahaanFormSchema = z.object({
  nama: z.string().min(1, "Nama perusahaan wajib diisi."),
  alamat: z.string().min(1, "Alamat wajib diisi."),
  kota: z.string().min(1, "Kota wajib diisi."),
  kabupaten: z.string().min(1, "Kabupaten wajib diisi."),
  npwp: z.string().regex(/^\d{1,16}$/, "NPWP wajib diisi, maksimal 16 digit angka."),
  email: z.union([z.literal(""), z.string().email("Format email tidak valid.")]),
  status: z.enum(["aktif", "nonaktif"]).optional(),
  pic: z.array(picSchema).min(1, "Minimal satu PIC."),
});
type PerusahaanForm = z.infer<typeof perusahaanFormSchema>;

const emptyPic = { nama: "", jabatan: "", telepon: "", email: "" };

/* ---------- create form ---------- */

function PerusahaanCreateForm({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { mutateAsync, isPending } = useCreatePerusahaan();
  const form = useForm<PerusahaanForm>({
    resolver: zodResolver(perusahaanFormSchema),
    defaultValues: { nama: "", alamat: "", kota: "", kabupaten: "", npwp: "", email: "", pic: [{ ...emptyPic }] },
  });
  const { register, handleSubmit, control, reset, formState: { errors } } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "pic" });

  const onSubmit = handleSubmit(async (values) => {
    await mutateAsync({
      nama: values.nama,
      alamat: values.alamat,
      kota: values.kota,
      kabupaten: values.kabupaten,
      npwp: values.npwp,
      email: values.email,
      pic: values.pic,
    });
    onOpenChange(false);
    reset();
  }, onFormInvalid);

  return (
    <FormSheet
      open={open}
      onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}
      title="Tambah Perusahaan"
      description="Lengkapi data perusahaan dan minimal satu kontak PIC."
      onSubmit={onSubmit}
      submitLabel={isPending ? "Menyimpan…" : "Simpan"}
    >
      <PerusahaanFormFields register={register} control={control} errors={errors} fields={fields} append={append} remove={remove} />
    </FormSheet>
  );
}

/* ---------- edit form ---------- */

function PerusahaanEditForm({
  perusahaan,
  open,
  onOpenChange,
  onSuccess,
}: {
  perusahaan: Perusahaan;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSuccess: (updated: Perusahaan) => void;
}) {
  const { mutateAsync, isPending } = useUpdatePerusahaan();
  const form = useForm<PerusahaanForm>({
    resolver: zodResolver(perusahaanFormSchema),
    defaultValues: {
      nama: perusahaan.nama,
      alamat: perusahaan.alamat,
      kota: perusahaan.kota,
      kabupaten: perusahaan.kabupaten,
      npwp: perusahaan.npwp,
      email: perusahaan.email ?? "",
      status: perusahaan.status,
      pic: perusahaan.pic,
    },
  });
  const { register, handleSubmit, control, reset, formState: { errors } } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "pic" });

  React.useEffect(() => {
    if (open) {
      reset({
        nama: perusahaan.nama,
        alamat: perusahaan.alamat,
        kota: perusahaan.kota,
        kabupaten: perusahaan.kabupaten,
        npwp: perusahaan.npwp,
        email: perusahaan.email ?? "",
        status: perusahaan.status,
        pic: perusahaan.pic,
      });
    }
  }, [open, perusahaan, reset]);

  const onSubmit = handleSubmit(async (values) => {
    const updated = await mutateAsync({
      id: perusahaan.id,
      input: {
        nama: values.nama,
        alamat: values.alamat,
        kota: values.kota,
        kabupaten: values.kabupaten,
        npwp: values.npwp,
        email: values.email,
        status: values.status ?? perusahaan.status,
        pic: values.pic.map((p) => ({
          nama: p.nama,
          jabatan: p.jabatan,
          telepon: p.telepon,
          email: p.email || "",
        })),
      },
    });
    onSuccess(updated);
    onOpenChange(false);
  }, onFormInvalid);

  return (
    <FormSheet
      open={open}
      onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}
      title="Ubah Perusahaan"
      description={`Perbarui data perusahaan ${perusahaan.number ?? perusahaan.id}.`}
      onSubmit={onSubmit}
      submitLabel={isPending ? "Menyimpan…" : "Simpan Perubahan"}
    >
      <PerusahaanFormFields register={register} control={control} errors={errors} fields={fields} append={append} remove={remove} withStatus />
    </FormSheet>
  );
}

/* ---------- shared form fields ---------- */

function PerusahaanFormFields({
  register,
  control,
  errors,
  fields,
  append,
  remove,
  withStatus,
}: {
  register: ReturnType<typeof useForm<PerusahaanForm>>["register"];
  control: ReturnType<typeof useForm<PerusahaanForm>>["control"];
  errors: ReturnType<typeof useForm<PerusahaanForm>>["formState"]["errors"];
  fields: ReturnType<typeof useFieldArray<PerusahaanForm, "pic">>["fields"];
  append: ReturnType<typeof useFieldArray<PerusahaanForm, "pic">>["append"];
  remove: ReturnType<typeof useFieldArray<PerusahaanForm, "pic">>["remove"];
  withStatus?: boolean;
}) {
  return (
    <>
      <Field data-invalid={!!errors.nama}>
        <FieldLabel htmlFor="p-nama">Nama Perusahaan</FieldLabel>
        <Input id="p-nama" placeholder="PT Maju Bersama Industri" aria-invalid={!!errors.nama} {...register("nama")} />
        <FieldError errors={errors.nama ? [errors.nama] : undefined} />
      </Field>

      <Field data-invalid={!!errors.alamat}>
        <FieldLabel htmlFor="p-alamat">Alamat</FieldLabel>
        <Textarea id="p-alamat" placeholder="Jl. Jenderal Sudirman No. 1" aria-invalid={!!errors.alamat} {...register("alamat")} />
        <FieldError errors={errors.alamat ? [errors.alamat] : undefined} />
      </Field>

      <Field data-invalid={!!errors.kota}>
        <FieldLabel htmlFor="p-kota">Kota</FieldLabel>
        <Input id="p-kota" placeholder="Jakarta" aria-invalid={!!errors.kota} {...register("kota")} />
        <FieldError errors={errors.kota ? [errors.kota] : undefined} />
      </Field>

      <Field data-invalid={!!errors.kabupaten}>
        <FieldLabel htmlFor="p-kabupaten">Kabupaten</FieldLabel>
        <Input id="p-kabupaten" placeholder="Kota Jakarta Selatan" aria-invalid={!!errors.kabupaten} {...register("kabupaten")} />
        <FieldError errors={errors.kabupaten ? [errors.kabupaten] : undefined} />
      </Field>

      <NpwpField id="p-npwp" error={errors.npwp} {...register("npwp")} />
      <EmailField id="p-email" label="Email (opsional)" error={errors.email} {...register("email")} />

      {withStatus && (
        <Field>
          <FieldLabel htmlFor="p-status">Status</FieldLabel>
          <Controller
            control={control}
            name="status"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="p-status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aktif">Aktif</SelectItem>
                  <SelectItem value="nonaktif">Nonaktif</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </Field>
      )}

      <div className="space-y-3 border-t border-border pt-4">
        <div className="flex items-center justify-between">
          <SectionLabel>Kontak PIC</SectionLabel>
          <Button type="button" variant="outline" size="sm" onClick={() => append({ ...emptyPic })}>
            <Plus className="size-4" /> Tambah PIC
          </Button>
        </div>

        {fields.map((f, i) => (
          <div key={f.id} className="space-y-2 rounded-lg border border-border p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">PIC {i + 1}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={fields.length === 1}
                onClick={() => remove(i)}
                aria-label={`Hapus PIC ${i + 1}`}
              >
                <X className="size-4" />
              </Button>
            </div>

            <Field data-invalid={!!errors.pic?.[i]?.nama}>
              <FieldLabel htmlFor={`p-pic-${i}-nama`}>Nama</FieldLabel>
              <Input id={`p-pic-${i}-nama`} placeholder="Andi Wijaya" aria-invalid={!!errors.pic?.[i]?.nama} {...register(`pic.${i}.nama`)} />
              <FieldError errors={errors.pic?.[i]?.nama ? [errors.pic[i]!.nama!] : undefined} />
            </Field>

            <Field>
              <FieldLabel htmlFor={`p-pic-${i}-jabatan`}>Jabatan (opsional)</FieldLabel>
              <Input id={`p-pic-${i}-jabatan`} placeholder="Direktur Operasional" {...register(`pic.${i}.jabatan`)} />
            </Field>

            <PhoneField id={`p-pic-${i}-telepon`} error={errors.pic?.[i]?.telepon} {...register(`pic.${i}.telepon`)} />
            <EmailField id={`p-pic-${i}-email`} label="Email (opsional)" error={errors.pic?.[i]?.email} {...register(`pic.${i}.email`)} />
          </div>
        ))}
      </div>
    </>
  );
}

/* ---------- page ---------- */

export default function PerusahaanPage() {
  const { data, isLoading, isError, refetch } = usePerusahaanList();
  const { mutate: deletePerusahaan, isPending: isDeleting } = useDeletePerusahaan();
  const [selected, setSelected] = useState<Perusahaan | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Perusahaan | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Perusahaan | null>(null);

  const columns = makeColumns(setSelected, setEditTarget, setDeleteTarget);

  // Filter state
  const [filterOpen, setFilterOpen]       = React.useState(false);
  const [pendingStatus, setPendingStatus] = React.useState<Perusahaan["status"][]>([]);
  const [pendingKota, setPendingKota]     = React.useState<string[]>([]);
  const [appliedStatus, setAppliedStatus] = React.useState<Perusahaan["status"][]>([]);
  const [appliedKota, setAppliedKota]     = React.useState<string[]>([]);

  const hasFilter  = appliedStatus.length > 0 || appliedKota.length > 0;
  const hasPending = pendingStatus.length > 0 || pendingKota.length > 0;
  const filterCount = (appliedStatus.length > 0 ? 1 : 0) + (appliedKota.length > 0 ? 1 : 0);

  const allKota = React.useMemo(() => {
    const names = new Set<string>();
    (data ?? []).forEach((p) => { if (p.kota) names.add(p.kota); });
    return Array.from(names).sort();
  }, [data]);

  const kotaOptions = React.useMemo<MultiSelectOption[]>(
    () => allKota.map((k) => ({ value: k, label: k })),
    [allKota],
  );

  const openFilter = () => {
    setPendingStatus(appliedStatus);
    setPendingKota(appliedKota);
    setFilterOpen(true);
  };
  const applyFilter = () => {
    setAppliedStatus(pendingStatus);
    setAppliedKota(pendingKota);
    setFilterOpen(false);
  };
  const resetFilter = () => {
    setPendingStatus([]); setPendingKota([]);
    setAppliedStatus([]); setAppliedKota([]);
    setFilterOpen(false);
  };

  const filteredData = React.useMemo(() => {
    let base = data ?? [];
    if (appliedStatus.length > 0) base = base.filter((p) => appliedStatus.includes(p.status));
    if (appliedKota.length > 0)   base = base.filter((p) => appliedKota.includes(p.kota));
    return base;
  }, [data, appliedStatus, appliedKota]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Building2 className="size-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold tracking-tight">Perusahaan</h1>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" /> Tambah Perusahaan
        </Button>
      </div>

      <PerusahaanCreateForm open={createOpen} onOpenChange={setCreateOpen} />

      {editTarget && (
        <PerusahaanEditForm
          perusahaan={editTarget}
          open={!!editTarget}
          onOpenChange={(o) => { if (!o) setEditTarget(null); }}
          onSuccess={(updated) => {
            if (selected?.id === updated.id) setSelected(updated);
            setEditTarget(null);
          }}
        />
      )}

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}
        entityLabel="Perusahaan"
        target={deleteTarget?.nama}
        loading={isDeleting}
        onConfirm={() => {
          if (!deleteTarget) return;
          deletePerusahaan(deleteTarget.id, {
            onSuccess: () => {
              if (selected?.id === deleteTarget.id) setSelected(null);
              setDeleteTarget(null);
            },
          });
        }}
      />

      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <DataTable
          columns={columns}
          data={filteredData}
          loading={isLoading}
          searchColumns={["number", "nama"]}
          searchPlaceholder="Cari No. Perusahaan atau nama…"
          emptyMessage="Belum ada perusahaan"
          defaultSorting={[{ id: "number", desc: true }]}
          rowActions={false}
          toolbarActions={
            <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={openFilter}>
              <SlidersHorizontal className="size-3.5" />
              Filter
              {hasFilter && (
                <Badge variant="secondary" className="px-1.5 py-0 text-xs">{filterCount}</Badge>
              )}
            </Button>
          }
        />
      )}

      {/* Filter dialog */}
      <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Filter Perusahaan</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-1">
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</p>
              <MultiSelectFilter
                options={STATUS_OPTIONS}
                value={pendingStatus}
                onChange={(v) => setPendingStatus(v as Perusahaan["status"][])}
                placeholder="Pilih status…"
                searchPlaceholder="Cari status…"
                noun="status"
              />
            </div>

            {allKota.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Kota</p>
                <MultiSelectFilter
                  options={kotaOptions}
                  value={pendingKota}
                  onChange={setPendingKota}
                  placeholder="Pilih kota…"
                  searchPlaceholder="Cari kota…"
                  noun="kota"
                />
              </div>
            )}
          </div>

          <DialogFooter className="flex-row items-center gap-2">
            <Button variant={hasPending ? "ghost" : "outline"} size="sm" className="mr-auto" onClick={resetFilter}>
              {hasPending ? "Reset" : "Tutup"}
            </Button>
            <Button size="sm" onClick={applyFilter}>Terapkan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <SheetContent className="overflow-y-auto sm:max-w-md">
          {selected && (
            <>
              <SheetHeader className="pr-10">
                <div className="mb-1 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Building2 className="size-5" />
                </div>
                <SheetTitle className="text-lg leading-tight font-semibold wrap-break-word">
                  {selected.nama}
                </SheetTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <SheetDescription className="font-mono text-sm text-muted-foreground">
                    {selected.id}
                  </SheetDescription>
                  <StatusBadge status={selected.status} map={STATUS_BADGE} />
                </div>
              </SheetHeader>
              <PerusahaanDetail p={selected} />
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
