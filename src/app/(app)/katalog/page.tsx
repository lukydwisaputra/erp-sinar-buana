"use client";
import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { BookOpen, FileText, FolderKanban, Plus, Tag } from "lucide-react";
import { DataTable } from "@/components/shared/data-table";
import { ErrorState } from "@/components/shared/error-state";
import { FormSheet } from "@/components/shared/form-sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldError, FieldDescription } from "@/components/ui/field";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  InputGroup, InputGroupAddon, InputGroupInput, InputGroupText,
} from "@/components/ui/input-group";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { StatTile, InfoRow, InfoList, SectionLabel } from "@/components/shared/detail-drawer";
import { formatRupiah, formatRupiahCompact } from "@/lib/format";
import { useKatalogList } from "@/lib/query/katalog";
import type { Layanan } from "@/lib/schemas/katalog";

const JENIS_DOKUMEN = ["Pertek", "AMDAL", "UKL-UPL", "SPPL", "Laporan"] as const;
const KEWENANGAN = ["Pusat (KLHK)", "Provinsi", "Kabupaten/Kota", "Kawasan Industri"] as const;

function StatusBadge({ status }: { status: Layanan["status"] }) {
  return status === "aktif" ? (
    <Badge variant="success">Aktif</Badge>
  ) : (
    <Badge variant="secondary">Terarsip</Badge>
  );
}

function harga(value: number | null) {
  return value === null ? "—" : formatRupiahCompact(value);
}

function makeColumns(onOpen: (l: Layanan) => void): ColumnDef<Layanan>[] {
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
      accessorKey: "nama", header: "Nama Layanan", meta: { className: "min-w-64" },
      cell: ({ row }) => (
        <button type="button" onClick={() => onOpen(row.original)}
          className="rounded-sm text-left font-medium hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
          {row.original.nama}
        </button>
      ),
    },
    {
      accessorKey: "jenisDokumen", header: "Jenis",
      cell: ({ row }) => <Badge variant="info">{row.original.jenisDokumen}</Badge>,
    },
    { accessorKey: "kewenangan", header: "Kewenangan" },
    {
      accessorKey: "hargaStandar", header: "Harga Standar",
      meta: { mono: true },
      cell: ({ row }) => harga(row.original.hargaStandar),
    },
    {
      accessorKey: "status", header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
  ];
}

function LayananDetail({ l }: { l: Layanan }) {
  return (
    <div className="space-y-6 px-4 pb-8">
      <section>
        <SectionLabel>Ringkasan</SectionLabel>
        <div className="grid grid-cols-2 gap-2">
          <StatTile label="Harga Standar" value={harga(l.hargaStandar)} title={l.hargaStandar === null ? "Diisi manual di SPH" : formatRupiah(l.hargaStandar)} icon={BookOpen} mono />
          <StatTile label="Dipakai di SPH" value={String(l.metrik.dipakaiSPH)} icon={FileText} />
          <StatTile label="Proyek" value={String(l.metrik.dipakaiProyek)} icon={FolderKanban} />
          <StatTile label="Jumlah Tag" value={String(l.tags.length)} icon={Tag} />
        </div>
      </section>

      {l.tags.length > 0 && (
        <section>
          <SectionLabel>Tag</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {l.tags.map((t) => <Badge key={t} variant="secondary">{t}</Badge>)}
          </div>
        </section>
      )}

      <section>
        <SectionLabel>Detail Layanan</SectionLabel>
        <InfoList>
          <InfoRow label="Jenis Dokumen" value={l.jenisDokumen} />
          <InfoRow label="Kewenangan" value={l.kewenangan} />
          <InfoRow label="Dasar Hukum" value={l.dasarHukum || "—"} />
        </InfoList>
      </section>
    </div>
  );
}

/* ---------- create form ---------- */

const layananCreateSchema = z.object({
  nama: z.string().min(1, "Nama layanan wajib diisi."),
  jenisDokumen: z.string().min(1, "Jenis dokumen wajib dipilih."),
  kewenangan: z.string().min(1, "Kewenangan wajib dipilih."),
  dasarHukum: z.string(),
  hargaStandar: z.string(),
  tags: z.string(),
});
type LayananCreate = z.infer<typeof layananCreateSchema>;

function LayananCreateForm({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const form = useForm<LayananCreate>({
    resolver: zodResolver(layananCreateSchema),
    defaultValues: { nama: "", jenisDokumen: "", kewenangan: "", dasarHukum: "", hargaStandar: "", tags: "" },
  });
  const { register, handleSubmit, control, reset, formState: { errors } } = form;

  const onSubmit = handleSubmit(() => {
    toast.success("Demo: data tidak benar-benar disimpan");
    onOpenChange(false);
    reset();
  });

  return (
    <FormSheet
      open={open}
      onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}
      title="Tambah Layanan"
      description="Tambahkan jenis layanan perizinan ke katalog."
      onSubmit={onSubmit}
    >
      <Field data-invalid={!!errors.nama}>
        <FieldLabel htmlFor="l-nama">Nama Layanan</FieldLabel>
        <Input id="l-nama" placeholder="Penyusunan Pertek Air Limbah" aria-invalid={!!errors.nama} {...register("nama")} />
        <FieldError errors={errors.nama ? [errors.nama] : undefined} />
      </Field>

      <Field data-invalid={!!errors.jenisDokumen}>
        <FieldLabel htmlFor="l-jenis">Jenis Dokumen</FieldLabel>
        <Controller
          control={control}
          name="jenisDokumen"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="l-jenis" className="w-full" aria-invalid={!!errors.jenisDokumen}>
                <SelectValue placeholder="Pilih jenis dokumen" />
              </SelectTrigger>
              <SelectContent>
                {JENIS_DOKUMEN.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        />
        <FieldError errors={errors.jenisDokumen ? [errors.jenisDokumen] : undefined} />
      </Field>

      <Field data-invalid={!!errors.kewenangan}>
        <FieldLabel htmlFor="l-kewenangan">Kewenangan</FieldLabel>
        <Controller
          control={control}
          name="kewenangan"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="l-kewenangan" className="w-full" aria-invalid={!!errors.kewenangan}>
                <SelectValue placeholder="Pilih kewenangan" />
              </SelectTrigger>
              <SelectContent>
                {KEWENANGAN.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        />
        <FieldError errors={errors.kewenangan ? [errors.kewenangan] : undefined} />
      </Field>

      <Field>
        <FieldLabel htmlFor="l-dasar">Dasar Hukum (opsional)</FieldLabel>
        <Input id="l-dasar" placeholder="PP No. 22 Tahun 2021" {...register("dasarHukum")} />
      </Field>

      <Field>
        <FieldLabel htmlFor="l-harga">Harga Standar (opsional)</FieldLabel>
        <InputGroup>
          <InputGroupAddon>
            <InputGroupText>Rp</InputGroupText>
          </InputGroupAddon>
          <InputGroupInput id="l-harga" inputMode="numeric" placeholder="75000000" className="text-right font-mono tabular-nums" {...register("hargaStandar")} />
        </InputGroup>
        <FieldDescription>Harga standar; masih dapat disesuaikan per proyek di SPH.</FieldDescription>
      </Field>

      <Field>
        <FieldLabel htmlFor="l-tags">Tag (opsional)</FieldLabel>
        <Input id="l-tags" placeholder="Pisahkan dengan koma, Air Limbah, Berulang" {...register("tags")} />
        <FieldDescription>Pisahkan dengan koma.</FieldDescription>
      </Field>
    </FormSheet>
  );
}

export default function KatalogPage() {
  const { data, isLoading, isError, refetch } = useKatalogList();
  const [selected, setSelected] = useState<Layanan | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const columns = makeColumns(setSelected);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <BookOpen className="size-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold tracking-tight">Katalog Layanan</h1>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" /> Tambah Layanan
        </Button>
      </div>

      <LayananCreateForm open={createOpen} onOpenChange={setCreateOpen} />

      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <DataTable columns={columns} data={data ?? []} loading={isLoading}
          searchColumn="nama" searchPlaceholder="Cari nama layanan…" emptyMessage="Belum ada layanan" />
      )}

      <Sheet open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <SheetContent className="overflow-y-auto sm:max-w-md">
          {selected && (
            <>
              <SheetHeader className="pr-10">
                <div className="mb-1 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <BookOpen className="size-5" />
                </div>
                <SheetTitle className="text-lg leading-tight font-semibold break-words">{selected.nama}</SheetTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <SheetDescription className="font-mono text-sm text-muted-foreground">{selected.id}</SheetDescription>
                  <StatusBadge status={selected.status} />
                </div>
              </SheetHeader>
              <LayananDetail l={selected} />
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
