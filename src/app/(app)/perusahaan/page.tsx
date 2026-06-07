"use client";
import type { ColumnDef } from "@tanstack/react-table";
import { Building2 } from "lucide-react";
import { DataTable } from "@/components/shared/data-table";
import { ErrorState } from "@/components/shared/error-state";
import { Badge } from "@/components/ui/badge";
import { usePerusahaanList } from "@/lib/query/perusahaan";
import type { Perusahaan } from "@/lib/schemas/perusahaan";

const columns: ColumnDef<Perusahaan>[] = [
  { accessorKey: "id", header: "ID", meta: { mono: true } },
  { accessorKey: "nama", header: "Nama Perusahaan" },
  { accessorKey: "pic", header: "PIC" },
  { accessorKey: "kota", header: "Kota" },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const s = row.original.status;
      return (
        <Badge variant={s === "aktif" ? "success" : "info"}>
          {s === "aktif" ? "Aktif" : "Nonaktif"}
        </Badge>
      );
    },
  },
];

export default function PerusahaanPage() {
  const { data, isLoading, isError, refetch } = usePerusahaanList();

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
    </div>
  );
}
