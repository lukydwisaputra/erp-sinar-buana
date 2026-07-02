"use client";
import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { ColumnDef } from "@tanstack/react-table";
import { ChevronDown, ChevronUp, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
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
import { Field, FieldError, FieldLabel, FieldDescription } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { onFormInvalid } from "@/lib/form-toast";
import {
  useOptionList, useCreateOption, useUpdateOption, useDeleteOption, useMoveOption,
} from "@/lib/query/daftar-pilihan";
import { calcMethod, daftarPilihanKategori, type CalcMethod, type DaftarPilihanKategori, type OptionItem } from "@/lib/schemas/daftar-pilihan";

const KATEGORI_META: Record<DaftarPilihanKategori, { label: string; hasPengali?: boolean; hasCalcMethod?: boolean; hasBank?: boolean }> = {
  jenis_dokumen: { label: "Jenis Dokumen" },
  kewenangan: { label: "Kewenangan" },
  dasar_hukum: { label: "Dasar Hukum" },
  area_kawasan: { label: "Area / Kawasan Industri" },
  jabatan: { label: "Jabatan" },
  status_kepegawaian: { label: "Status Kepegawaian", hasPengali: true },
  komponen_gaji: { label: "Komponen Gaji", hasCalcMethod: true },
  rekening_bank: { label: "Rekening Bank", hasBank: true },
};

const CALC_METHOD_LABEL: Record<CalcMethod, string> = {
  nominal_tetap: "Nominal Tetap",
  persen_gaji_pokok: "% Gaji Pokok",
  manual: "Manual",
};

function makeColumns(
  meta: (typeof KATEGORI_META)[DaftarPilihanKategori],
  onMove: (item: OptionItem, direction: "up" | "down") => void,
  onEdit: (item: OptionItem) => void,
  onDelete: (item: OptionItem) => void,
  onToggleAktif: (item: OptionItem, aktif: boolean) => void,
): ColumnDef<OptionItem>[] {
  const columns: ColumnDef<OptionItem>[] = [
    {
      id: "urutan", header: "", meta: { className: "w-16" },
      cell: ({ row }) => (
        <div className="flex gap-0.5">
          <Button variant="ghost" size="icon" className="size-6" onClick={() => onMove(row.original, "up")}>
            <ChevronUp className="size-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="size-6" onClick={() => onMove(row.original, "down")}>
            <ChevronDown className="size-3.5" />
          </Button>
        </div>
      ),
    },
    { accessorKey: "nama", header: "Nama", meta: { className: "min-w-48" } },
  ];

  if (meta.hasPengali) {
    columns.push({
      id: "pengali", header: "Pengali", meta: { mono: true, className: "text-center" },
      cell: ({ row }) => row.original.extra.pengali ?? "—",
    });
  }
  if (meta.hasCalcMethod) {
    columns.push({
      id: "calcMethod", header: "Cara Hitung", meta: { className: "text-center" },
      cell: ({ row }) => row.original.extra.calcMethod ? CALC_METHOD_LABEL[row.original.extra.calcMethod] : "—",
    });
  }
  if (meta.hasBank) {
    columns.push({
      id: "bank", header: "Rekening", meta: { className: "min-w-48" },
      cell: ({ row }) => {
        const bank = row.original.extra.bank;
        return bank ? `${bank.nama} — ${bank.nomor} a.n. ${bank.atasNama}` : "—";
      },
    });
  }

  columns.push(
    {
      id: "aktif", header: "Aktif", meta: { className: "text-center" },
      cell: ({ row }) => (
        <Switch
          size="sm"
          checked={row.original.aktif}
          onCheckedChange={(checked) => onToggleAktif(row.original, checked)}
        />
      ),
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
  calcMethod: calcMethod.optional(),
  bankNama: z.string().optional(),
  bankAtasNama: z.string().optional(),
  bankNomor: z.string().optional(),
});
type OptionForm = z.input<typeof baseFormSchema>;

function extraFromForm(meta: (typeof KATEGORI_META)[DaftarPilihanKategori], values: OptionForm): OptionItem["extra"] {
  const extra: OptionItem["extra"] = {};
  if (meta.hasPengali && values.pengali !== undefined) extra.pengali = Number(values.pengali);
  if (meta.hasCalcMethod && values.calcMethod) extra.calcMethod = values.calcMethod;
  if (meta.hasBank && values.bankNama && values.bankAtasNama && values.bankNomor) {
    extra.bank = { nama: values.bankNama, atasNama: values.bankAtasNama, nomor: values.bankNomor };
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
      {meta.hasCalcMethod && (
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
  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<OptionForm>({
    resolver: zodResolver(baseFormSchema),
    defaultValues: {
      nama: item?.nama ?? "", pengali: item?.extra.pengali, calcMethod: item?.extra.calcMethod,
      bankNama: item?.extra.bank?.nama ?? "", bankAtasNama: item?.extra.bank?.atasNama ?? "", bankNomor: item?.extra.bank?.nomor ?? "",
    },
  });

  React.useEffect(() => {
    reset({
      nama: item?.nama ?? "", pengali: item?.extra.pengali, calcMethod: item?.extra.calcMethod,
      bankNama: item?.extra.bank?.nama ?? "", bankAtasNama: item?.extra.bank?.atasNama ?? "", bankNomor: item?.extra.bank?.nomor ?? "",
    });
  }, [item, reset]);

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
  const { mutate: moveOption } = useMoveOption();
  const { mutate: updateOption } = useUpdateOption();
  const { mutate: deleteOption, isPending: isDeleting } = useDeleteOption();
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<OptionItem | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<OptionItem | null>(null);

  const columns = makeColumns(
    meta,
    (item, direction) => moveOption({ id: item.id, kategori, direction }),
    setEditTarget,
    setDeleteTarget,
    (item, aktif) => updateOption({ id: item.id, kategori, patch: { aktif } }),
  );

  return (
    <div className="space-y-4">
      {kategori === "komponen_gaji" && (
        <p className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          Katalog referensi — belum terhubung ke perhitungan slip gaji. Kolom Tunjangan/Lembur/Bonus/PPh 21/BPJS
          di Penggajian tetap dihitung dari field tetap, bukan dari daftar ini.
        </p>
      )}
      <div className="flex items-center justify-end">
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" /> Tambah {meta.label}
        </Button>
      </div>

      <CreateOptionForm kategori={kategori} meta={meta} open={createOpen} onOpenChange={setCreateOpen} />
      <EditOptionForm kategori={kategori} meta={meta} item={editTarget} onOpenChange={(o) => { if (!o) setEditTarget(null); }} />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Item?</AlertDialogTitle>
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
                deleteOption({ id: deleteTarget.id, kategori }, { onSuccess: () => setDeleteTarget(null) });
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
        searchPlaceholder={`Cari ${meta.label.toLowerCase()}…`}
        emptyMessage="Belum ada item"
        rowActions={false}
      />
    </div>
  );
}

export function DaftarPilihanTab() {
  const [active, setActive] = React.useState<DaftarPilihanKategori>("jenis_dokumen");

  return (
    <Tabs orientation="vertical" value={active} onValueChange={(v) => setActive(v as DaftarPilihanKategori)}>
      <div className="flex gap-6">
        <TabsList className="h-fit flex-col">
          {daftarPilihanKategori.options.map((k) => (
            <TabsTrigger key={k} value={k} className="w-full justify-start">
              {KATEGORI_META[k].label}
            </TabsTrigger>
          ))}
        </TabsList>
        <div className="flex-1">
          {daftarPilihanKategori.options.map((k) => (
            <TabsContent key={k} value={k}>
              <KategoriList kategori={k} />
            </TabsContent>
          ))}
        </div>
      </div>
    </Tabs>
  );
}
