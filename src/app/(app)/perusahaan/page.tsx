"use client";
import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Building2, FileText, FolderKanban, Plus, Receipt, Wallet, X } from "lucide-react";
import { DataTable } from "@/components/shared/data-table";
import { ErrorState } from "@/components/shared/error-state";
import { FormSheet } from "@/components/shared/form-sheet";
import { NpwpField, PhoneField, EmailField } from "@/components/shared/form-fields";
import { StatTile, InfoRow, InfoList, SectionLabel, ContactCard } from "@/components/shared/detail-drawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { formatRupiah, formatRupiahCompact } from "@/lib/format";
import { usePerusahaanList } from "@/lib/query/perusahaan";
import type { Perusahaan } from "@/lib/schemas/perusahaan";

function StatusBadge({ status }: { status: Perusahaan["status"] }) {
  return status === "aktif" ? (
    <Badge variant="success">Aktif</Badge>
  ) : (
    <Badge variant="secondary">Nonaktif</Badge>
  );
}

/** Columns are built with an `onOpen` callback so the ID/Nama cells open the detail drawer. */
function makeColumns(onOpen: (p: Perusahaan) => void): ColumnDef<Perusahaan>[] {
  return [
    {
      accessorKey: "id",
      header: "ID",
      meta: { mono: true },
      cell: ({ row }) => (
        <button
          type="button"
          onClick={() => onOpen(row.original)}
          className="rounded-sm font-mono text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {row.original.id}
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
        const extra = pics.length - 1;
        return (
          <span>
            {pics[0]?.nama ?? "—"}
            {extra > 0 && <span className="ml-1 text-muted-foreground">+{extra}</span>}
          </span>
        );
      },
    },
    { accessorKey: "kota", header: "Kota" },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
  ];
}

/* ---------- detail drawer pieces ---------- */

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
          <InfoRow label="Telepon" value={<span className="font-mono">{p.telepon}</span>} />
          <InfoRow label="Email" value={<a href={`mailto:${p.email}`} className="text-primary hover:underline">{p.email}</a>} />
        </InfoList>
      </section>
    </div>
  );
}

/* ---------- create form ---------- */

const perusahaanCreateSchema = z.object({
  nama: z.string().min(1, "Nama perusahaan wajib diisi."),
  alamat: z.string().min(1, "Alamat wajib diisi."),
  kota: z.string().min(1, "Kota wajib diisi."),
  npwp: z.union([z.literal(""), z.string().regex(/^\d{1,16}$/, "NPWP maksimal 16 digit angka.")]),
  email: z.union([z.literal(""), z.string().email("Format email tidak valid.")]),
  pic: z
    .array(
      z.object({
        nama: z.string().min(1, "Nama PIC wajib."),
        jabatan: z.string(),
        telepon: z.string().min(1, "Nomor HP wajib."),
        email: z.union([z.literal(""), z.string().email("Format email tidak valid.")]),
      }),
    )
    .min(1, "Minimal satu PIC."),
});
type PerusahaanCreate = z.infer<typeof perusahaanCreateSchema>;

const emptyPic = { nama: "", jabatan: "", telepon: "", email: "" };

function PerusahaanCreateForm({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const form = useForm<PerusahaanCreate>({
    resolver: zodResolver(perusahaanCreateSchema),
    defaultValues: { nama: "", alamat: "", kota: "", npwp: "", email: "", pic: [{ ...emptyPic }] },
  });
  const { register, handleSubmit, control, reset, formState: { errors } } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "pic" });

  const onSubmit = handleSubmit(() => {
    toast.success("Demo: data tidak benar-benar disimpan");
    onOpenChange(false);
    reset();
  });

  return (
    <FormSheet
      open={open}
      onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}
      title="Tambah Perusahaan"
      description="Lengkapi data perusahaan dan minimal satu kontak PIC."
      onSubmit={onSubmit}
    >
      <Field data-invalid={!!errors.nama}>
        <FieldLabel htmlFor="p-nama">Nama Perusahaan</FieldLabel>
        <Input id="p-nama" placeholder="PT Maju Bersama Industri" aria-invalid={!!errors.nama} {...register("nama")} />
        <FieldError errors={errors.nama ? [errors.nama] : undefined} />
      </Field>

      <Field data-invalid={!!errors.alamat}>
        <FieldLabel htmlFor="p-alamat">Alamat</FieldLabel>
        <Textarea id="p-alamat" placeholder="Jl. Jenderal Sudirman No. 1, Jakarta Selatan" aria-invalid={!!errors.alamat} {...register("alamat")} />
        <FieldError errors={errors.alamat ? [errors.alamat] : undefined} />
      </Field>

      <Field data-invalid={!!errors.kota}>
        <FieldLabel htmlFor="p-kota">Kota</FieldLabel>
        <Input id="p-kota" placeholder="Jakarta" aria-invalid={!!errors.kota} {...register("kota")} />
        <FieldError errors={errors.kota ? [errors.kota] : undefined} />
      </Field>

      <NpwpField id="p-npwp" error={errors.npwp} {...register("npwp")} />

      <EmailField id="p-email" error={errors.email} {...register("email")} />

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
    </FormSheet>
  );
}

export default function PerusahaanPage() {
  const { data, isLoading, isError, refetch } = usePerusahaanList();
  const [selected, setSelected] = useState<Perusahaan | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const columns = makeColumns(setSelected);

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

      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <DataTable
          columns={columns}
          data={data ?? []}
          loading={isLoading}
          searchColumn="nama"
          searchPlaceholder="Cari nama perusahaan…"
          emptyMessage="Belum ada perusahaan"
        />
      )}

      <Sheet open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <SheetContent className="overflow-y-auto sm:max-w-md">
          {selected && (
            <>
              <SheetHeader className="pr-10">
                <div className="mb-1 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Building2 className="size-5" />
                </div>
                <SheetTitle className="text-lg leading-tight font-semibold break-words">
                  {selected.nama}
                </SheetTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <SheetDescription className="font-mono text-sm text-muted-foreground">
                    {selected.id}
                  </SheetDescription>
                  <StatusBadge status={selected.status} />
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
