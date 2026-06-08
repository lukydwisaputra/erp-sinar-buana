"use client";
import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Building2, FileText, FolderKanban, Receipt, Wallet } from "lucide-react";
import { DataTable } from "@/components/shared/data-table";
import { ErrorState } from "@/components/shared/error-state";
import { StatTile, InfoRow, InfoList, SectionLabel, ContactCard } from "@/components/shared/detail-drawer";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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

export default function PerusahaanPage() {
  const { data, isLoading, isError, refetch } = usePerusahaanList();
  const [selected, setSelected] = useState<Perusahaan | null>(null);
  const columns = makeColumns(setSelected);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Building2 className="size-5 text-muted-foreground" />
        <h1 className="text-xl font-semibold tracking-tight">Perusahaan</h1>
      </div>

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
