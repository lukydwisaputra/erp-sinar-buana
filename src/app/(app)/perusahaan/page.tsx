"use client";
import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Building2 } from "lucide-react";
import { DataTable } from "@/components/shared/data-table";
import { ErrorState } from "@/components/shared/error-state";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { usePerusahaanList } from "@/lib/query/perusahaan";
import type { Perusahaan } from "@/lib/schemas/perusahaan";

function StatusBadge({ status }: { status: Perusahaan["status"] }) {
  return status === "aktif" ? (
    <Badge variant="success">Aktif</Badge>
  ) : (
    <Badge variant="secondary">Nonaktif</Badge>
  );
}

/** Columns are built with an `onOpen` callback so the ID/Nama cells can open the detail drawer. */
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
    { accessorKey: "pic", header: "PIC" },
    { accessorKey: "kota", header: "Kota" },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
  ];
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-3 py-2.5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="col-span-2 text-sm">{value}</dd>
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
        <SheetContent className="sm:max-w-md">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="font-mono text-base">{selected.id}</SheetTitle>
                <SheetDescription>{selected.nama}</SheetDescription>
              </SheetHeader>
              <div className="px-4">
                <StatusBadge status={selected.status} />
                <Separator className="my-3" />
                <dl className="divide-y divide-border">
                  <DetailRow label="Nama" value={selected.nama} />
                  <DetailRow label="NPWP" value={<span className="font-mono">{selected.npwp}</span>} />
                  <DetailRow label="PIC" value={selected.pic} />
                  <DetailRow label="Telepon" value={<span className="font-mono">{selected.telepon}</span>} />
                  <DetailRow
                    label="Email"
                    value={
                      <a href={`mailto:${selected.email}`} className="text-primary hover:underline">
                        {selected.email}
                      </a>
                    }
                  />
                  <DetailRow label="Kota" value={selected.kota} />
                </dl>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
