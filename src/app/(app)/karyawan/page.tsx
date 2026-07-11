"use client";
import * as React from "react";
import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Users, Wallet, CalendarDays, CalendarIcon, MoreHorizontal, Pencil, Plus, SlidersHorizontal, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { DataTable } from "@/components/shared/data-table";
import { ErrorState } from "@/components/shared/error-state";
import { FormSheet } from "@/components/shared/form-sheet";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { MultiSelectFilter, type MultiSelectOption } from "@/components/shared/multi-select-filter";
import { NpwpField, PhoneField, EmailField } from "@/components/shared/form-fields";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge, type badgeVariants } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  InputGroup, InputGroupAddon, InputGroupInput, InputGroupText,
} from "@/components/ui/input-group";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { StatTile, InfoRow, InfoList, SectionLabel, initials } from "@/components/shared/detail-drawer";
import { formatRupiah, formatRupiahCompact } from "@/lib/format";
import { useKaryawanList, useCreateKaryawan, useUpdateKaryawan, useDeleteKaryawan } from "@/lib/query/karyawan";
import { useOptionList } from "@/lib/query/daftar-pilihan";
import { onFormInvalid } from "@/lib/form-toast";
import { ptkpStatusValues, type Karyawan } from "@/lib/schemas/karyawan";
import type { VariantProps } from "class-variance-authority";

type BadgeVariant = VariantProps<typeof badgeVariants>["variant"];

/** Status Kepegawaian is a client-managed Daftar Pilihan list now (Konfigurasi),
 * not a closed enum — badge color is a best-effort label match with a plain
 * fallback for any status the client adds later. */
function kepegawaianVariant(label: string): BadgeVariant {
  const l = label.toLowerCase();
  if (l.includes("tetap")) return "success";
  if (l.includes("kontrak")) return "info";
  if (l.includes("probation") || l.includes("magang")) return "warning";
  return "outline";
}

const STATUS_OPTIONS: MultiSelectOption[] = [
  { value: "aktif", label: "Aktif", variant: "success" },
  { value: "terarsip", label: "Terarsip", variant: "secondary" },
];

function masaKerja(isoDate: string | null): string {
  if (!isoDate) return "—";
  const start = new Date(isoDate);
  const years = Math.floor((Date.now() - start.getTime()) / (365.25 * 24 * 3600 * 1000));
  return years <= 0 ? "< 1 tahun" : `${years} tahun`;
}

function tanggalID(isoDate: string | null): string {
  if (!isoDate) return "—";
  return new Date(isoDate).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

function makeColumns(
  onOpen: (k: Karyawan) => void,
  onEdit: (k: Karyawan) => void,
  onDelete: (k: Karyawan) => void,
): ColumnDef<Karyawan>[] {
  return [
    {
      accessorKey: "number", header: "No. Karyawan", meta: { mono: true },
      cell: ({ row }) => (
        <button type="button" onClick={() => onOpen(row.original)}
          className="rounded-sm font-mono text-(--link) hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
          {row.original.number ?? "—"}
        </button>
      ),
    },
    {
      accessorKey: "nama", header: "Nama", meta: { className: "min-w-64" },
      cell: ({ row }) => (
        <button type="button" onClick={() => onOpen(row.original)}
          className="rounded-sm text-left font-medium hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
          {row.original.nama}
        </button>
      ),
    },
    { accessorKey: "jabatan", header: "Jabatan" },
    {
      accessorKey: "statusKepegawaian", header: "Kepegawaian", meta: { className: "text-center" },
      cell: ({ row }) => (
        <Badge variant={kepegawaianVariant(row.original.statusKepegawaian)}>{row.original.statusKepegawaian}</Badge>
      ),
    },
    {
      accessorKey: "status", header: "Status", meta: { className: "text-center" },
      cell: ({ row }) => row.original.status === "terarsip"
        ? <Badge variant="secondary">Terarsip</Badge>
        : <Badge variant="success">Aktif</Badge>,
    },
    {
      accessorKey: "tanggalMasuk", header: "Tanggal Masuk",
      cell: ({ row }) => tanggalID(row.original.tanggalMasuk),
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
              variant="destructive"
              onSelect={() => onDelete(row.original)}
            >
              <Trash2 className="size-3.5" /> Nonaktifkan
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];
}

/* ---------- detail drawer ---------- */

function KaryawanDetail({ k }: { k: Karyawan }) {
  return (
    <div className="space-y-6 px-4 pb-8">
      <section>
        <SectionLabel>Ringkasan</SectionLabel>
        <div className="grid grid-cols-2 gap-2">
          <StatTile label="Gaji Pokok" value={formatRupiahCompact(k.gajiPokok)} title={formatRupiah(k.gajiPokok)} icon={Wallet} mono />
          <StatTile label="Masa Kerja" value={masaKerja(k.tanggalMasuk)} icon={CalendarDays} />
        </div>
      </section>

      <section>
        <SectionLabel>Data Karyawan</SectionLabel>
        <InfoList>
          <InfoRow label="Jabatan" value={k.jabatan} />
          <InfoRow label="Tunjangan" value={formatRupiah(k.tunjangan)} />
          <InfoRow label="NPWP" value={<span className="font-mono">{k.npwp ?? "—"}</span>} />
          <InfoRow label="PTKP" value={k.ptkpStatus ?? "—"} />
          <InfoRow label="Bank" value={k.bank.nama ? `${k.bank.nama} • ${k.bank.nomor}` : "—"} />
          <InfoRow label="a.n." value={k.bank.atasNama ?? "—"} />
          <InfoRow label="Email" value={k.email ? <a href={`mailto:${k.email}`} className="text-(--link) hover:underline">{k.email}</a> : "—"} />
          <InfoRow label="No. HP" value={<span className="font-mono">{k.telepon ?? "—"}</span>} />
          <InfoRow label="Tanggal Masuk" value={tanggalID(k.tanggalMasuk)} />
        </InfoList>
      </section>
    </div>
  );
}

/* ---------- shared form schema ---------- */

const karyawanFormSchema = z.object({
  nama: z.string().min(1, "Nama wajib diisi."),
  positionId: z.string().min(1, "Jabatan wajib dipilih."),
  employmentStatusId: z.string().min(1, "Status kepegawaian wajib dipilih."),
  gajiPokok: z.coerce.number({ message: "Gaji pokok wajib diisi." }).min(1, "Gaji pokok wajib diisi."),
  bankNama: z.string().optional(),
  bankNomor: z.union([z.literal(""), z.string().regex(/^\d+$/, "Nomor rekening harus angka.")]).optional(),
  bankAtasNama: z.string().optional(),
  npwp: z.union([z.literal(""), z.string().regex(/^\d{1,16}$/, "NPWP maksimal 16 digit angka.")]).optional(),
  ptkpStatus: z.string().optional(),
  email: z.union([z.literal(""), z.string().email("Format email tidak valid.")]).optional(),
  telepon: z.string().optional(),
  tanggalMasuk: z.string().min(1, "Tanggal masuk wajib diisi."),
  status: z.enum(["aktif", "terarsip"]).optional(),
});
type KaryawanForm = z.input<typeof karyawanFormSchema>;

/* ---------- create form ---------- */

function KaryawanCreateForm({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { mutateAsync, isPending } = useCreateKaryawan();
  const form = useForm<KaryawanForm>({
    resolver: zodResolver(karyawanFormSchema),
    defaultValues: {
      nama: "", positionId: "", employmentStatusId: "",
      gajiPokok: undefined,
      bankNama: "", bankNomor: "", bankAtasNama: "",
      npwp: "", email: "", telepon: "", tanggalMasuk: "", ptkpStatus: undefined,
    },
  });
  const { register, handleSubmit, control, reset, formState: { errors } } = form;

  const onSubmit = handleSubmit(async (values) => {
    await mutateAsync({
      nama: values.nama,
      positionId: values.positionId,
      employmentStatusId: values.employmentStatusId,
      gajiPokok: Number(values.gajiPokok),
      bankNama: values.bankNama,
      bankNomor: values.bankNomor,
      bankAtasNama: values.bankAtasNama,
      npwp: values.npwp,
      ptkpStatus: values.ptkpStatus as (typeof ptkpStatusValues)[number] | undefined,
      email: values.email,
      telepon: values.telepon,
      tanggalMasuk: values.tanggalMasuk,
    });
    onOpenChange(false);
    reset();
  }, onFormInvalid);

  return (
    <FormSheet
      open={open}
      onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}
      title="Tambah Karyawan"
      description="Lengkapi data karyawan dan informasi penggajian."
      onSubmit={onSubmit}
      submitLabel={isPending ? "Menyimpan…" : "Simpan"}
    >
      <KaryawanFormFields register={register} control={control} errors={errors} />
    </FormSheet>
  );
}

/* ---------- edit form ---------- */

function KaryawanEditForm({
  karyawan,
  open,
  onOpenChange,
  onSuccess,
}: {
  karyawan: Karyawan;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSuccess: (updated: Karyawan) => void;
}) {
  const { mutateAsync, isPending } = useUpdateKaryawan();
  const defaults = React.useCallback((k: Karyawan): KaryawanForm => ({
    nama: k.nama,
    positionId: k.positionId ?? "",
    employmentStatusId: k.employmentStatusId ?? "",
    gajiPokok: k.gajiPokok,
    bankNama: k.bank.nama ?? "",
    bankNomor: k.bank.nomor ?? "",
    bankAtasNama: k.bank.atasNama ?? "",
    npwp: k.npwp ?? "",
    ptkpStatus: k.ptkpStatus ?? undefined,
    email: k.email ?? "",
    telepon: k.telepon ?? "",
    tanggalMasuk: k.tanggalMasuk ?? "",
    status: k.status,
  }), []);
  const form = useForm<KaryawanForm>({
    resolver: zodResolver(karyawanFormSchema),
    defaultValues: defaults(karyawan),
  });
  const { register, handleSubmit, control, reset, formState: { errors } } = form;

  React.useEffect(() => {
    if (open) reset(defaults(karyawan));
  }, [open, karyawan, reset, defaults]);

  const onSubmit = handleSubmit(async (values) => {
    const updated = await mutateAsync({
      id: karyawan.id,
      input: {
        nama: values.nama,
        positionId: values.positionId,
        employmentStatusId: values.employmentStatusId,
        gajiPokok: Number(values.gajiPokok),
        bankNama: values.bankNama,
        bankNomor: values.bankNomor,
        bankAtasNama: values.bankAtasNama,
        npwp: values.npwp,
        ptkpStatus: values.ptkpStatus as (typeof ptkpStatusValues)[number] | undefined,
        email: values.email,
        telepon: values.telepon,
        tanggalMasuk: values.tanggalMasuk,
        status: values.status ?? karyawan.status,
      },
    });
    onSuccess(updated);
    onOpenChange(false);
  }, onFormInvalid);

  return (
    <FormSheet
      open={open}
      onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}
      title="Ubah Karyawan"
      description={`Perbarui data karyawan ${karyawan.nama}.`}
      onSubmit={onSubmit}
      submitLabel={isPending ? "Menyimpan…" : "Simpan Perubahan"}
    >
      <KaryawanFormFields register={register} control={control} errors={errors} withStatus />
    </FormSheet>
  );
}

/* ---------- date field ---------- */

function DateField({ label, value, onChange, error }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: { message?: string };
}) {
  const [open, setOpen] = React.useState(false);
  const date = value ? new Date(value + "T00:00:00") : undefined;
  return (
    <Field data-invalid={!!error}>
      <FieldLabel>{label}</FieldLabel>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" className={cn("w-full justify-start font-normal", !date && "text-muted-foreground")}>
            <CalendarIcon />
            {date ? format(date, "dd MMMM yyyy", { locale: idLocale }) : "Pilih tanggal"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={date} locale={idLocale} autoFocus
            onSelect={(d) => { onChange(d ? format(d, "yyyy-MM-dd") : ""); setOpen(false); }} />
        </PopoverContent>
      </Popover>
      <FieldError errors={error ? [error] : undefined} />
    </Field>
  );
}

/* ---------- shared form fields ---------- */

function KaryawanFormFields({
  register,
  control,
  errors,
  withStatus,
}: {
  register: ReturnType<typeof useForm<KaryawanForm>>["register"];
  control: ReturnType<typeof useForm<KaryawanForm>>["control"];
  errors: ReturnType<typeof useForm<KaryawanForm>>["formState"]["errors"];
  withStatus?: boolean;
}) {
  const { data: jabatanOptions = [] } = useOptionList("jabatan");
  const { data: statusOptions = [] } = useOptionList("status_kepegawaian");
  return (
    <>
      <Field data-invalid={!!errors.nama}>
        <FieldLabel htmlFor="k-nama">Nama</FieldLabel>
        <Input id="k-nama" placeholder="Budi Santoso" aria-invalid={!!errors.nama} {...register("nama")} />
        <FieldError errors={errors.nama ? [errors.nama] : undefined} />
      </Field>

      <Field data-invalid={!!errors.positionId}>
        <FieldLabel htmlFor="k-jabatan">Jabatan</FieldLabel>
        <Controller
          control={control}
          name="positionId"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="k-jabatan" className="w-full" aria-invalid={!!errors.positionId}>
                <SelectValue placeholder="Pilih jabatan…" />
              </SelectTrigger>
              <SelectContent>
                {jabatanOptions.map((o) => <SelectItem key={o.id} value={o.id}>{o.nama}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        />
        <FieldError errors={errors.positionId ? [errors.positionId] : undefined} />
      </Field>

      <Field data-invalid={!!errors.employmentStatusId}>
        <FieldLabel htmlFor="k-kepegawaian">Status Kepegawaian</FieldLabel>
        <Controller
          control={control}
          name="employmentStatusId"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="k-kepegawaian" className="w-full" aria-invalid={!!errors.employmentStatusId}>
                <SelectValue placeholder="Pilih status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((o) => <SelectItem key={o.id} value={o.id}>{o.nama}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        />
        <FieldError errors={errors.employmentStatusId ? [errors.employmentStatusId] : undefined} />
      </Field>

      <Field data-invalid={!!errors.gajiPokok}>
        <FieldLabel htmlFor="k-gaji">Gaji Pokok</FieldLabel>
        <InputGroup>
          <InputGroupAddon><InputGroupText>Rp</InputGroupText></InputGroupAddon>
          <InputGroupInput id="k-gaji" type="number" inputMode="numeric" placeholder="12000000" aria-invalid={!!errors.gajiPokok} className="text-right font-mono tabular-nums" {...register("gajiPokok")} />
        </InputGroup>
        <FieldError errors={errors.gajiPokok ? [errors.gajiPokok] : undefined} />
      </Field>

      <div className="space-y-3 border-t border-border pt-4">
        <SectionLabel>Rekening Bank (opsional)</SectionLabel>

        <Field data-invalid={!!errors.bankNama}>
          <FieldLabel htmlFor="k-bank-nama">Nama Bank</FieldLabel>
          <Input id="k-bank-nama" placeholder="BCA" aria-invalid={!!errors.bankNama} {...register("bankNama")} />
          <FieldError errors={errors.bankNama ? [errors.bankNama] : undefined} />
        </Field>

        <Field data-invalid={!!errors.bankNomor}>
          <FieldLabel htmlFor="k-bank-nomor">Nomor Rekening</FieldLabel>
          <Input id="k-bank-nomor" inputMode="numeric" placeholder="1234567890" aria-invalid={!!errors.bankNomor} {...register("bankNomor")} />
          <FieldError errors={errors.bankNomor ? [errors.bankNomor] : undefined} />
        </Field>

        <Field data-invalid={!!errors.bankAtasNama}>
          <FieldLabel htmlFor="k-bank-an">Atas Nama</FieldLabel>
          <Input id="k-bank-an" placeholder="Budi Santoso" aria-invalid={!!errors.bankAtasNama} {...register("bankAtasNama")} />
          <FieldError errors={errors.bankAtasNama ? [errors.bankAtasNama] : undefined} />
        </Field>
      </div>

      <NpwpField id="k-npwp" error={errors.npwp} {...register("npwp")} />
      <EmailField id="k-email" error={errors.email} {...register("email")} />
      <PhoneField id="k-telepon" label="No. HP (opsional)" error={errors.telepon} {...register("telepon")} />

      <Field data-invalid={!!errors.ptkpStatus}>
        <FieldLabel htmlFor="k-ptkp">PTKP (opsional)</FieldLabel>
        <Controller
          control={control}
          name="ptkpStatus"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="k-ptkp" className="w-full">
                <SelectValue placeholder="Pilih status PTKP…" />
              </SelectTrigger>
              <SelectContent>
                {ptkpStatusValues.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        />
      </Field>

      <Controller
        control={control}
        name="tanggalMasuk"
        render={({ field }) => (
          <DateField
            label="Tanggal Masuk"
            value={field.value ?? ""}
            onChange={field.onChange}
            error={errors.tanggalMasuk}
          />
        )}
      />

      {withStatus && (
        <Field>
          <FieldLabel htmlFor="k-status">Status Karyawan</FieldLabel>
          <Controller
            control={control}
            name="status"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="k-status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aktif">Aktif</SelectItem>
                  <SelectItem value="terarsip">Terarsip</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </Field>
      )}
    </>
  );
}

/* ---------- page ---------- */

export default function KaryawanPage() {
  const { data, isLoading, isError, refetch } = useKaryawanList();
  const { mutate: deleteKaryawan, isPending: isDeleting } = useDeleteKaryawan();
  const { data: statusOptions = [] } = useOptionList("status_kepegawaian");
  const [selected, setSelected] = useState<Karyawan | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Karyawan | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Karyawan | null>(null);

  // Filter state
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [pendingKepegawaian, setPendingKepegawaian] = React.useState<string[]>([]);
  const [pendingStatus, setPendingStatus] = React.useState<Karyawan["status"][]>([]);
  const [appliedKepegawaian, setAppliedKepegawaian] = React.useState<string[]>([]);
  const [appliedStatus, setAppliedStatus] = React.useState<Karyawan["status"][]>([]);

  const kepegawaianFilterOptions: MultiSelectOption[] = statusOptions.map((o) => ({
    value: o.nama, label: o.nama, variant: kepegawaianVariant(o.nama),
  }));

  const hasFilter = appliedKepegawaian.length > 0 || appliedStatus.length > 0;
  const hasPending = pendingKepegawaian.length > 0 || pendingStatus.length > 0;
  const filterCount = (appliedKepegawaian.length > 0 ? 1 : 0) + (appliedStatus.length > 0 ? 1 : 0);

  const openFilter = () => {
    setPendingKepegawaian(appliedKepegawaian);
    setPendingStatus(appliedStatus);
    setFilterOpen(true);
  };
  const applyFilter = () => {
    setAppliedKepegawaian(pendingKepegawaian);
    setAppliedStatus(pendingStatus);
    setFilterOpen(false);
  };
  const resetFilter = () => {
    setPendingKepegawaian([]); setPendingStatus([]);
    setAppliedKepegawaian([]); setAppliedStatus([]);
    setFilterOpen(false);
  };

  const filteredData = React.useMemo(() => {
    let base = data ?? [];
    if (appliedKepegawaian.length > 0)
      base = base.filter((k) => appliedKepegawaian.includes(k.statusKepegawaian));
    if (appliedStatus.length > 0)
      base = base.filter((k) => appliedStatus.includes(k.status));
    return base;
  }, [data, appliedKepegawaian, appliedStatus]);

  const columns = makeColumns(setSelected, setEditTarget, setDeleteTarget);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Users className="size-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold tracking-tight">Karyawan</h1>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" /> Tambah Karyawan
        </Button>
      </div>

      <KaryawanCreateForm open={createOpen} onOpenChange={setCreateOpen} />

      {editTarget && (
        <KaryawanEditForm
          karyawan={editTarget}
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
        entityLabel="Karyawan"
        target={deleteTarget?.nama}
        loading={isDeleting}
        description={
          <>
            <strong>{deleteTarget?.nama}</strong> akan diubah statusnya menjadi <strong>Terarsip</strong>. Data tetap tersimpan dan dapat diaktifkan kembali melalui menu Ubah.
          </>
        }
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteKaryawan(deleteTarget.id, {
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
          searchPlaceholder="Cari nomor atau nama karyawan…"
          emptyMessage="Belum ada karyawan"
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

      <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Filter Karyawan</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-1">
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Status Kepegawaian</p>
              <MultiSelectFilter
                options={kepegawaianFilterOptions}
                value={pendingKepegawaian}
                onChange={(v) => setPendingKepegawaian(v as string[])}
                placeholder="Pilih status kepegawaian…"
                searchPlaceholder="Cari…"
                noun="status"
              />
            </div>

            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</p>
              <MultiSelectFilter
                options={STATUS_OPTIONS}
                value={pendingStatus}
                onChange={(v) => setPendingStatus(v as Karyawan["status"][])}
                placeholder="Pilih status…"
                searchPlaceholder="Cari status…"
                noun="status"
              />
            </div>
          </div>

          <DialogFooter className="flex-row items-center gap-2">
            <Button
              variant={hasPending ? "ghost" : "outline"}
              size="sm"
              className="mr-auto"
              onClick={resetFilter}
            >
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
                <Avatar className="mb-1 size-10"><AvatarFallback>{initials(selected.nama)}</AvatarFallback></Avatar>
                <SheetTitle className="text-lg leading-tight font-semibold wrap-break-word">{selected.nama}</SheetTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <SheetDescription className="font-mono text-sm text-muted-foreground">{selected.number ?? "—"}</SheetDescription>
                  <Badge variant={kepegawaianVariant(selected.statusKepegawaian)}>{selected.statusKepegawaian}</Badge>
                </div>
              </SheetHeader>
              <KaryawanDetail k={selected} />
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
