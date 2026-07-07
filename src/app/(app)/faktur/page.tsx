"use client";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { ReceiptText, Plus } from "lucide-react";
import { DataTable } from "@/components/shared/data-table";
import { ErrorState } from "@/components/shared/error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatRupiah } from "@/lib/format";
import { useFakturList } from "@/lib/query/faktur";
import type { FakturInduk } from "@/lib/schemas/faktur";

function statusVariant(systemRole: string | null): "info" | "warning" | "success" | "secondary" | "destructive" {
  if (systemRole === "LUNAS") return "success";
  if (systemRole === "BATAL") return "secondary";
  return "warning";
}

function FakturPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const proyekId = searchParams.get("proyekId") ?? undefined;
  const { data = [], isLoading, isError, refetch } = useFakturList(proyekId);

  const columns: ColumnDef<FakturInduk>[] = [
    {
      id: "proyek", header: "Proyek", meta: { className: "min-w-56" },
      accessorKey: "proyekNama",
      cell: ({ row }) => (
        <button
          type="button"
          onClick={() => router.push(`/faktur/${encodeURIComponent(row.original.id)}`)}
          className="rounded-sm text-(--link) hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {row.original.proyekNama}
        </button>
      ),
    },
    { id: "perusahaan", header: "Perusahaan", accessorKey: "perusahaanNama", meta: { className: "min-w-56" } },
    {
      id: "termin", header: "Termin", meta: { mono: true },
      accessorFn: (row) => row.termins.length,
      cell: ({ row }) => `${row.original.termins.length}/${row.original.terminScheme.length}`,
    },
    {
      id: "total", header: "Total Biaya", meta: { mono: true },
      accessorFn: (row) => row.totalBiaya,
      cell: ({ row }) => formatRupiah(row.original.totalBiaya),
    },
    {
      id: "status", header: "Status", meta: { className: "text-center" },
      accessorKey: "status",
      cell: ({ row }) => <Badge variant={statusVariant(row.original.statusSystemRole)}>{row.original.status}</Badge>,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ReceiptText className="size-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold tracking-tight">Faktur</h1>
        </div>
        {proyekId && (
          <Button size="sm" onClick={() => router.push(`/faktur/baru?proyekId=${encodeURIComponent(proyekId)}`)}>
            <Plus className="size-4" /> Buat Faktur Induk
          </Button>
        )}
      </div>

      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <DataTable
          columns={columns}
          data={data}
          loading={isLoading}
          searchColumns={["proyekNama", "perusahaanNama"]}
          searchPlaceholder="Cari proyek atau perusahaan…"
          emptyMessage="Belum ada Faktur Induk"
          rowActions={false}
        />
      )}
    </div>
  );
}

export default function FakturPage() {
  return (
    <Suspense>
      <FakturPageInner />
    </Suspense>
  );
}
