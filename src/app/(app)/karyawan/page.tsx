"use client";
import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Users, Wallet, CalendarDays, Plus } from "lucide-react";
import { DataTable } from "@/components/shared/data-table";
import { ErrorState } from "@/components/shared/error-state";
import { FormSheet } from "@/components/shared/form-sheet";
import { NpwpField, PhoneField, EmailField } from "@/components/shared/form-fields";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
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
import { StatTile, InfoRow, InfoList, SectionLabel, initials } from "@/components/shared/detail-drawer";
import { formatRupiah, formatRupiahCompact } from "@/lib/format";
import { useKaryawanList } from "@/lib/query/karyawan";
import { delay } from "@/lib/data/_delay";
import type { Karyawan } from "@/lib/schemas/karyawan";

const KEPEGAWAIAN_OPTIONS = [
  { value: "tetap", label: "Tetap" },
  { value: "kontrak", label: "Kontrak" },
  { value: "probation", label: "Magang" },
] as const;

const KEPEGAWAIAN: Record<Karyawan["statusKepegawaian"], { label: string; variant: "success" | "info" | "warning" }> = {
  tetap: { label: "Tetap", variant: "success" },
  kontrak: { label: "Kontrak", variant: "info" },
  probation: { label: "Magang", variant: "warning" },
};

function KepegawaianBadge({ status }: { status: Karyawan["statusKepegawaian"] }) {
  const k = KEPEGAWAIAN[status];
  return <Badge variant={k.variant}>{k.label}</Badge>;
}

function masaKerja(isoDate: string): string {
  const start = new Date(isoDate);
  const years = Math.floor((Date.now() - start.getTime()) / (365.25 * 24 * 3600 * 1000));
  return years <= 0 ? "< 1 tahun" : `${years} tahun`;
}

function tanggalID(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

function makeColumns(onOpen: (k: Karyawan) => void): ColumnDef<Karyawan>[] {
  return [
    {
      accessorKey: "id", header: "ID", meta: { mono: true },
      cell: ({ row }) => (
        <button type="button" onClick={() => onOpen(row.original)}
          className="rounded-sm font-mono text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
          {row.original.id}
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
      accessorKey: "statusKepegawaian", header: "Status",
      cell: ({ row }) => <KepegawaianBadge status={row.original.statusKepegawaian} />,
    },
    {
      accessorKey: "tanggalMasuk", header: "Tanggal Masuk",
      cell: ({ row }) => tanggalID(row.original.tanggalMasuk),
    },
  ];
}

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
          <InfoRow label="NPWP" value={<span className="font-mono">{k.npwp}</span>} />
          <InfoRow label="Bank" value={`${k.bank.nama} • ${k.bank.nomor}`} />
          <InfoRow label="a.n." value={k.bank.atasNama} />
          <InfoRow label="Email" value={<a href={`mailto:${k.email}`} className="text-primary hover:underline">{k.email}</a>} />
          <InfoRow label="No. HP" value={<span className="font-mono">{k.telepon}</span>} />
          <InfoRow label="Tanggal Masuk" value={tanggalID(k.tanggalMasuk)} />
        </InfoList>
      </section>
    </div>
  );
}

/* ---------- create form ---------- */

const karyawanCreateSchema = z.object({
  nama: z.string().min(1, "Nama wajib diisi."),
  jabatan: z.string().min(1, "Jabatan wajib diisi."),
  statusKepegawaian: z.enum(["tetap", "kontrak", "probation"]),
  gajiPokok: z.coerce.number({ message: "Gaji pokok wajib diisi." }).min(1, "Gaji pokok wajib diisi."),
  bank: z.object({
    nama: z.string().min(1, "Nama bank wajib diisi."),
    nomor: z.string().regex(/^\d+$/, "Nomor rekening harus angka."),
    atasNama: z.string().min(1, "Atas nama wajib diisi."),
  }),
  npwp: z.union([z.literal(""), z.string().regex(/^\d{1,16}$/, "NPWP maksimal 16 digit angka.")]),
  email: z.union([z.literal(""), z.string().email("Format email tidak valid.")]),
  telepon: z.string().min(1, "Nomor HP wajib."),
  tanggalMasuk: z.string().min(1, "Tanggal masuk wajib diisi."),
});
type KaryawanCreate = z.input<typeof karyawanCreateSchema>;

function KaryawanCreateForm({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const form = useForm<KaryawanCreate>({
    resolver: zodResolver(karyawanCreateSchema),
    defaultValues: {
      nama: "", jabatan: "", statusKepegawaian: "tetap",
      gajiPokok: undefined,
      bank: { nama: "", nomor: "", atasNama: "" },
      npwp: "", email: "", telepon: "", tanggalMasuk: "",
    },
  });
  const { register, handleSubmit, control, reset, formState: { errors } } = form;

  const onSubmit = handleSubmit(async () => {
    await delay();
    toast.success("Demo: data tidak benar-benar disimpan");
    onOpenChange(false);
    reset();
  });

  return (
    <FormSheet
      open={open}
      onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}
      title="Tambah Karyawan"
      description="Lengkapi data karyawan dan informasi penggajian."
      onSubmit={onSubmit}
    >
      <Field data-invalid={!!errors.nama}>
        <FieldLabel htmlFor="k-nama">Nama</FieldLabel>
        <Input id="k-nama" placeholder="Budi Santoso" aria-invalid={!!errors.nama} {...register("nama")} />
        <FieldError errors={errors.nama ? [errors.nama] : undefined} />
      </Field>

      <Field data-invalid={!!errors.jabatan}>
        <FieldLabel htmlFor="k-jabatan">Jabatan</FieldLabel>
        <Input id="k-jabatan" placeholder="Ketua Tim Teknis" aria-invalid={!!errors.jabatan} {...register("jabatan")} />
        <FieldError errors={errors.jabatan ? [errors.jabatan] : undefined} />
      </Field>

      <Field data-invalid={!!errors.statusKepegawaian}>
        <FieldLabel htmlFor="k-status">Status Kepegawaian</FieldLabel>
        <Controller
          control={control}
          name="statusKepegawaian"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="k-status" className="w-full" aria-invalid={!!errors.statusKepegawaian}>
                <SelectValue placeholder="Pilih status" />
              </SelectTrigger>
              <SelectContent>
                {KEPEGAWAIAN_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        />
        <FieldError errors={errors.statusKepegawaian ? [errors.statusKepegawaian] : undefined} />
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
        <SectionLabel>Rekening Bank</SectionLabel>

        <Field data-invalid={!!errors.bank?.nama}>
          <FieldLabel htmlFor="k-bank-nama">Nama Bank</FieldLabel>
          <Input id="k-bank-nama" placeholder="BCA" aria-invalid={!!errors.bank?.nama} {...register("bank.nama")} />
          <FieldError errors={errors.bank?.nama ? [errors.bank.nama] : undefined} />
        </Field>

        <Field data-invalid={!!errors.bank?.nomor}>
          <FieldLabel htmlFor="k-bank-nomor">Nomor Rekening</FieldLabel>
          <Input id="k-bank-nomor" inputMode="numeric" placeholder="1234567890" aria-invalid={!!errors.bank?.nomor} {...register("bank.nomor")} />
          <FieldError errors={errors.bank?.nomor ? [errors.bank.nomor] : undefined} />
        </Field>

        <Field data-invalid={!!errors.bank?.atasNama}>
          <FieldLabel htmlFor="k-bank-an">Atas Nama</FieldLabel>
          <Input id="k-bank-an" placeholder="Budi Santoso" aria-invalid={!!errors.bank?.atasNama} {...register("bank.atasNama")} />
          <FieldError errors={errors.bank?.atasNama ? [errors.bank.atasNama] : undefined} />
        </Field>
      </div>

      <NpwpField id="k-npwp" error={errors.npwp} {...register("npwp")} />

      <EmailField id="k-email" error={errors.email} {...register("email")} />

      <PhoneField id="k-telepon" error={errors.telepon} {...register("telepon")} />

      <Field data-invalid={!!errors.tanggalMasuk}>
        <FieldLabel htmlFor="k-tanggal">Tanggal Masuk</FieldLabel>
        <Input id="k-tanggal" type="date" aria-invalid={!!errors.tanggalMasuk} {...register("tanggalMasuk")} />
        <FieldError errors={errors.tanggalMasuk ? [errors.tanggalMasuk] : undefined} />
      </Field>
    </FormSheet>
  );
}

export default function KaryawanPage() {
  const { data, isLoading, isError, refetch } = useKaryawanList();
  const [selected, setSelected] = useState<Karyawan | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const columns = makeColumns(setSelected);

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

      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <DataTable columns={columns} data={data ?? []} loading={isLoading}
          searchColumn="nama" searchPlaceholder="Cari nama karyawan…" emptyMessage="Belum ada karyawan" />
      )}

      <Sheet open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <SheetContent className="overflow-y-auto sm:max-w-md">
          {selected && (
            <>
              <SheetHeader className="pr-10">
                <Avatar className="mb-1 size-10"><AvatarFallback>{initials(selected.nama)}</AvatarFallback></Avatar>
                <SheetTitle className="text-lg leading-tight font-semibold break-words">{selected.nama}</SheetTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <SheetDescription className="font-mono text-sm text-muted-foreground">{selected.id}</SheetDescription>
                  <KepegawaianBadge status={selected.statusKepegawaian} />
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
