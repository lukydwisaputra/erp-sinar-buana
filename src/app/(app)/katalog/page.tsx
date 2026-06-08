"use client";
import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { BookOpen, FileText, FolderKanban, Tag } from "lucide-react";
import { DataTable } from "@/components/shared/data-table";
import { ErrorState } from "@/components/shared/error-state";
import { Badge } from "@/components/ui/badge";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { StatTile, InfoRow, InfoList, SectionLabel } from "@/components/shared/detail-drawer";
import { formatRupiah, formatRupiahCompact } from "@/lib/format";
import { useKatalogList } from "@/lib/query/katalog";
import type { Layanan } from "@/lib/schemas/katalog";

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
      accessorKey: "nama", header: "Nama Layanan",
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
          <InfoRow label="Dasar Hukum" value={l.dasarHukum} />
          <InfoRow label="Template Milestone" value={l.templateMilestone ?? "—"} />
        </InfoList>
      </section>
    </div>
  );
}

export default function KatalogPage() {
  const { data, isLoading, isError, refetch } = useKatalogList();
  const [selected, setSelected] = useState<Layanan | null>(null);
  const columns = makeColumns(setSelected);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <BookOpen className="size-5 text-muted-foreground" />
        <h1 className="text-xl font-semibold tracking-tight">Katalog Layanan</h1>
      </div>

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
