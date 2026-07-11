"use client";
import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { DataTable } from "@/components/shared/data-table";
import { FormSheet } from "@/components/shared/form-sheet";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldError, FieldLabel, FieldDescription } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { onFormInvalid } from "@/lib/form-toast";
import { rowNumberColumn } from "@/components/konfigurasi/row-number-column";
import {
  useOptionList, useCreateOption, useUpdateOption, useDeleteOption,
} from "@/lib/query/daftar-pilihan";
import {
  calcMethod, komponenGajiKind, daftarPilihanKategori,
  type CalcMethod, type KomponenGajiKind, type DaftarPilihanKategori, type OptionItem,
} from "@/lib/schemas/daftar-pilihan";

const KATEGORI_META: Record<DaftarPilihanKategori, {
  label: string; hasPengali?: boolean; hasKomponenGaji?: boolean; hasBank?: boolean;
}> = {
  jenis_dokumen: { label: "Jenis Dokumen" },
  kewenangan: { label: "Kewenangan" },
  dasar_hukum: { label: "Dasar Hukum" },
  area_kawasan: { label: "Area / Kawasan Industri" },
  jabatan: { label: "Jabatan" },
  status_kepegawaian: { label: "Status Kepegawaian", hasPengali: true },
  komponen_gaji: { label: "Komponen Gaji", hasKomponenGaji: true },
  rekening_bank: { label: "Rekening Bank", hasBank: true },
};

const KIND_LABEL: Record<KomponenGajiKind, string> = {
  tunjangan: "Tunjangan",
  potongan: "Potongan",
};

const CALC_METHOD_LABEL: Record<CalcMethod, string> = {
  nominal: "Nominal Tetap",
  persentase: "% Gaji Pokok",
  per_hari: "Per Hari",
};

function makeColumns(
  meta: (typeof KATEGORI_META)[DaftarPilihanKategori],
  onEdit: (item: OptionItem) => void,
  onDelete: (item: OptionItem) => void,
  onToggleAktif: (item: OptionItem, aktif: boolean) => void,
): ColumnDef<OptionItem>[] {
  const columns: ColumnDef<OptionItem>[] = [
    rowNumberColumn<OptionItem>(),
    { accessorKey: "nama", header: "Nama", enableSorting: false, meta: { className: "min-w-48" } },
  ];

  if (meta.hasPengali) {
    columns.push({
      id: "pengali", header: "Pengali", enableSorting: false, meta: { mono: true, className: "text-center" },
      cell: ({ row }) => row.original.extra.pengali ?? "—",
    });
  }
  if (meta.hasKomponenGaji) {
    columns.push(
      {
        id: "kind", header: "Jenis", enableSorting: false, meta: { className: "text-center" },
        cell: ({ row }) => row.original.extra.kind
          ? <Badge variant={row.original.extra.kind === "tunjangan" ? "success" : "warning"}>{KIND_LABEL[row.original.extra.kind]}</Badge>
          : "—",
      },
      {
        id: "calcMethod", header: "Cara Hitung", enableSorting: false, meta: { className: "text-center" },
        cell: ({ row }) => row.original.extra.calcMethod ? CALC_METHOD_LABEL[row.original.extra.calcMethod] : "—",
      },
    );
  }
  if (meta.hasBank) {
    columns.push({
      id: "bank", header: "Rekening", enableSorting: false, meta: { className: "min-w-48" },
      cell: ({ row }) => {
        const bank = row.original.extra.bank;
        if (!bank) return "—";
        return (
          <span>
            {bank.nama} — {bank.nomor} a.n. {bank.atasNama}
            {row.original.extra.isDefault && <Badge variant="secondary" className="ml-1.5">Utama</Badge>}
          </span>
        );
      },
    });
  }

  columns.push(
    {
      id: "aktif", header: "Aktif", enableSorting: false, meta: { className: "text-center" },
      cell: ({ row }) => (
        <div className="flex justify-center">
          <Checkbox
            checked={row.original.aktif}
            onCheckedChange={(checked) => onToggleAktif(row.original, checked === true)}
          />
        </div>
      ),
    },
    {
      id: "actions", header: "", enableSorting: false, meta: { className: "w-10" },
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger className="outline-none">
            <MoreHorizontal className="size-4 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => onEdit(row.original)}>
              <Pencil className="size-3.5" /> Ubah
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
  );

  return columns;
}

const baseFormSchema = z.object({
  nama: z.string().min(1, "Nama wajib diisi."),
  pengali: z.coerce.number().positive().optional(),
  kind: komponenGajiKind.optional(),
  calcMethod: calcMethod.optional(),
  defaultValue: z.coerce.number().optional(),
  isEmployerPortion: z.boolean().optional(),
  bankNama: z.string().optional(),
  bankAtasNama: z.string().optional(),
  bankNomor: z.string().optional(),
  isDefault: z.boolean().optional(),
});
type OptionForm = z.input<typeof baseFormSchema>;

function extraFromForm(meta: (typeof KATEGORI_META)[DaftarPilihanKategori], values: OptionForm): OptionItem["extra"] {
  const extra: OptionItem["extra"] = {};
  if (meta.hasPengali && values.pengali !== undefined) extra.pengali = Number(values.pengali);
  if (meta.hasKomponenGaji) {
    if (values.kind) extra.kind = values.kind;
    if (values.calcMethod) extra.calcMethod = values.calcMethod;
    if (values.defaultValue !== undefined) extra.defaultValue = Number(values.defaultValue);
    extra.isEmployerPortion = !!values.isEmployerPortion;
  }
  if (meta.hasBank) {
    if (values.bankNama && values.bankAtasNama && values.bankNomor) {
      extra.bank = { nama: values.bankNama, atasNama: values.bankAtasNama, nomor: values.bankNomor };
    }
    extra.isDefault = !!values.isDefault;
  }
  return extra;
}

function OptionFormFields({ meta, register, control, errors }: {
  meta: (typeof KATEGORI_META)[DaftarPilihanKategori];
  register: ReturnType<typeof useForm<OptionForm>>["register"];
  control: ReturnType<typeof useForm<OptionForm>>["control"];
  errors: ReturnType<typeof useForm<OptionForm>>["formState"]["errors"];
}) {
  return (
    <>
      <Field>
        <FieldLabel>Nama</FieldLabel>
        <Input {...register("nama")} />
        {errors.nama && <FieldError>{errors.nama.message}</FieldError>}
      </Field>
      {meta.hasPengali && (
        <Field>
          <FieldLabel>Pengali</FieldLabel>
          <Input type="number" step="0.01" {...register("pengali")} />
          <FieldDescription>Pengali gaji pokok, mis. 0.8 untuk probation.</FieldDescription>
          {errors.pengali && <FieldError>{errors.pengali.message}</FieldError>}
        </Field>
      )}
      {meta.hasKomponenGaji && (
        <>
          <Field>
            <FieldLabel>Jenis</FieldLabel>
            <Controller
              name="kind"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue placeholder="Pilih jenis…" /></SelectTrigger>
                  <SelectContent>
                    {komponenGajiKind.options.map((v) => (
                      <SelectItem key={v} value={v}>{KIND_LABEL[v]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <Field>
            <FieldLabel>Cara Hitung</FieldLabel>
            <Controller
              name="calcMethod"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue placeholder="Pilih cara hitung…" /></SelectTrigger>
                  <SelectContent>
                    {calcMethod.options.map((v) => (
                      <SelectItem key={v} value={v}>{CALC_METHOD_LABEL[v]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <Field>
            <FieldLabel>Nilai Default</FieldLabel>
            <Input type="number" step="1" {...register("defaultValue")} />
            <FieldDescription>Nominal (Rp) atau persentase, tergantung cara hitung.</FieldDescription>
          </Field>
          <Field className="flex-row items-center gap-2">
            <Controller
              name="isEmployerPortion"
              control={control}
              render={({ field }) => (
                <Checkbox checked={field.value ?? false} onCheckedChange={(c) => field.onChange(c === true)} />
              )}
            />
            <FieldLabel className="font-normal">Porsi perusahaan (mis. BPJS sisi perusahaan)</FieldLabel>
          </Field>
        </>
      )}
      {meta.hasBank && (
        <>
          <Field>
            <FieldLabel>Nama Bank</FieldLabel>
            <Input {...register("bankNama")} />
          </Field>
          <Field>
            <FieldLabel>Atas Nama</FieldLabel>
            <Input {...register("bankAtasNama")} />
          </Field>
          <Field>
            <FieldLabel>Nomor Rekening</FieldLabel>
            <Input {...register("bankNomor")} />
          </Field>
          <Field className="flex-row items-center gap-2">
            <Controller
              name="isDefault"
              control={control}
              render={({ field }) => (
                <Checkbox checked={field.value ?? false} onCheckedChange={(c) => field.onChange(c === true)} />
              )}
            />
            <FieldLabel className="font-normal">Jadikan rekening utama</FieldLabel>
          </Field>
        </>
      )}
    </>
  );
}

function CreateOptionForm({
  kategori, meta, open, onOpenChange,
}: {
  kategori: DaftarPilihanKategori;
  meta: (typeof KATEGORI_META)[DaftarPilihanKategori];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { mutateAsync, isPending } = useCreateOption();
  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<OptionForm>({
    resolver: zodResolver(baseFormSchema),
    defaultValues: { nama: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    await mutateAsync({ kategori, nama: values.nama, extra: extraFromForm(meta, values) });
    onOpenChange(false);
    reset();
  }, onFormInvalid);

  return (
    <FormSheet
      open={open}
      onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}
      title={`Tambah ${meta.label}`}
      onSubmit={onSubmit}
      submitLabel={isPending ? "Menyimpan…" : "Simpan"}
    >
      <OptionFormFields meta={meta} register={register} control={control} errors={errors} />
    </FormSheet>
  );
}

function EditOptionForm({
  kategori, meta, item, onOpenChange,
}: {
  kategori: DaftarPilihanKategori;
  meta: (typeof KATEGORI_META)[DaftarPilihanKategori];
  item: OptionItem | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { mutateAsync, isPending } = useUpdateOption();
  const defaults = React.useCallback((it: OptionItem | null): OptionForm => ({
    nama: it?.nama ?? "",
    pengali: it?.extra.pengali,
    kind: it?.extra.kind,
    calcMethod: it?.extra.calcMethod,
    defaultValue: it?.extra.defaultValue,
    isEmployerPortion: it?.extra.isEmployerPortion,
    bankNama: it?.extra.bank?.nama ?? "",
    bankAtasNama: it?.extra.bank?.atasNama ?? "",
    bankNomor: it?.extra.bank?.nomor ?? "",
    isDefault: it?.extra.isDefault,
  }), []);
  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<OptionForm>({
    resolver: zodResolver(baseFormSchema),
    defaultValues: defaults(item),
  });

  React.useEffect(() => {
    reset(defaults(item));
  }, [item, reset, defaults]);

  const onSubmit = handleSubmit(async (values) => {
    if (!item) return;
    await mutateAsync({
      id: item.id, kategori,
      patch: { ...(item.locked ? {} : { nama: values.nama }), extra: extraFromForm(meta, values) },
    });
    onOpenChange(false);
  }, onFormInvalid);

  return (
    <FormSheet
      open={!!item}
      onOpenChange={onOpenChange}
      title={`Ubah ${meta.label}`}
      description={item?.locked ? "Item terkunci — nama tidak dapat diubah." : undefined}
      onSubmit={onSubmit}
      submitLabel={isPending ? "Menyimpan…" : "Simpan"}
    >
      {item?.locked ? (
        <Field>
          <FieldLabel>Nama</FieldLabel>
          <Input value={item.nama} disabled />
        </Field>
      ) : null}
      <OptionFormFields meta={meta} register={register} control={control} errors={errors} />
    </FormSheet>
  );
}

function KategoriList({ kategori }: { kategori: DaftarPilihanKategori }) {
  const meta = KATEGORI_META[kategori];
  const { data, isLoading } = useOptionList(kategori, { includeInactive: true });
  const { mutate: updateOption } = useUpdateOption();
  const { mutate: deleteOption, isPending: isDeleting } = useDeleteOption();
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<OptionItem | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<OptionItem | null>(null);

  const columns = makeColumns(
    meta,
    setEditTarget,
    setDeleteTarget,
    (item, aktif) => updateOption({ id: item.id, kategori, patch: { aktif } }),
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" /> Tambah {meta.label}
        </Button>
      </div>

      <CreateOptionForm kategori={kategori} meta={meta} open={createOpen} onOpenChange={setCreateOpen} />
      <EditOptionForm kategori={kategori} meta={meta} item={editTarget} onOpenChange={(o) => { if (!o) setEditTarget(null); }} />

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}
        entityLabel="Item"
        target={deleteTarget?.nama}
        loading={isDeleting}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteOption({ id: deleteTarget.id, kategori }, { onSuccess: () => setDeleteTarget(null) });
        }}
      />

      <DataTable
        columns={columns}
        data={data ?? []}
        loading={isLoading}
        searchColumns={["nama"]}
        searchPlaceholder={`Cari ${meta.label.toLowerCase()}…`}
        emptyMessage="Belum ada item"
        rowActions={false}
      />
    </div>
  );
}

export function DaftarPilihanTab() {
  return (
    <Tabs defaultValue="jenis_dokumen">
      <TabsList variant="line">
        {daftarPilihanKategori.options.map((k) => (
          <TabsTrigger key={k} value={k}>{KATEGORI_META[k].label}</TabsTrigger>
        ))}
      </TabsList>
      {daftarPilihanKategori.options.map((k) => (
        <TabsContent key={k} value={k}><KategoriList kategori={k} /></TabsContent>
      ))}
    </Tabs>
  );
}
