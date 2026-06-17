"use client";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { Wallet, Plus } from "lucide-react";
import { DataTable } from "@/components/shared/data-table";
import { ErrorState } from "@/components/shared/error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useBatchList } from "@/lib/query/penggajian";
import type { PenggajianBatch } from "@/lib/schemas/penggajian";

function periodStr(p: PenggajianBatch["periode"]) {
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  return `${fmt(p.mulai)} – ${fmt(p.selesai)}`;
}

export default function PenggajianPage() {
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useBatchList();

  const columns: ColumnDef<PenggajianBatch>[] = [
    {
      accessorKey: "id", header: "ID", meta: { mono: true },
      cell: ({ row }) => (
        <button type="button"
          onClick={() => router.push(`/penggajian/${row.original.id}`)}
          className="rounded-sm font-mono text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
          {row.original.id}
        </button>
      ),
    },
    {
      accessorKey: "periode", header: "Periode",
      cell: ({ row }) => periodStr(row.original.periode),
    },
    {
      id: "jumlahKaryawan", header: "Karyawan",
      cell: ({ row }) => row.original.slips.length,
    },
    {
      id: "sudahDibayar", header: "Sudah Dibayar",
      cell: ({ row }) => {
        const paid = row.original.slips.filter((s) => s.status === "sudah_dibayar").length;
        const total = row.original.slips.length;
        const all = paid === total;
        return (
          <Badge variant={all ? "success" : paid > 0 ? "warning" : "secondary"}>
            {paid}/{total}
          </Badge>
        );
      },
    },
    {
      accessorKey: "createdAt", header: "Dibuat",
      cell: ({ row }) =>
        new Date(row.original.createdAt).toLocaleDateString("id-ID", {
          day: "numeric", month: "long", year: "numeric",
        }),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet className="size-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold tracking-tight">Penggajian</h1>
        </div>
        <Button size="sm" onClick={() => router.push("/penggajian/baru")}>
          <Plus className="size-4 mr-1.5" /> Buat Penggajian
        </Button>
      </div>

      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <DataTable
          columns={columns}
          data={data ?? []}
          loading={isLoading}
          searchColumn="id"
          searchPlaceholder="Cari ID penggajian…"
          emptyMessage="Belum ada penggajian"
        />
      )}
    </div>
  );
}
