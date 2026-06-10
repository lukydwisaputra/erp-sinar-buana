"use client";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { ReceiptText } from "lucide-react";
import { DataTable } from "@/components/shared/data-table";
import { ErrorState } from "@/components/shared/error-state";
import { Badge } from "@/components/ui/badge";
import { formatRupiah } from "@/lib/format";
import { groupFakturByDeal } from "@/lib/faktur";
import type { DealRekap } from "@/lib/faktur";
import { useFakturList } from "@/lib/query/faktur";

function tanggalID(iso: string) {
  return iso
    ? new Date(iso).toLocaleDateString("id-ID", {
        day: "numeric", month: "long", year: "numeric",
      })
    : "—";
}

function dealStatus(
  deal: DealRekap,
): { label: string; variant: "info" | "warning" | "success" | "destructive" } {
  if (deal.termins.every((t) => t.status === "lunas")) {
    return { label: "Lunas", variant: "success" };
  }
  if (deal.termins.some((t) => t.overdue)) {
    return { label: "Jatuh Tempo", variant: "destructive" };
  }
  if (deal.termins.some((t) => t.status === "menunggu")) {
    return { label: "Belum Lunas", variant: "info" };
  }
  return { label: "Draft", variant: "info" };
}

export default function FakturPage() {
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useFakturList();
  const deals = data ? groupFakturByDeal(data) : [];

  const columns: ColumnDef<DealRekap>[] = [
    {
      id: "sphId", header: "No. Faktur", meta: { mono: true },
      cell: ({ row }) => {
        const deal = row.original;
        const latestId = deal.latestFaktur?.id;
        if (!latestId) return <span className="font-mono">{deal.sphId}</span>;
        return (
          <button
            type="button"
            onClick={() => router.push(`/faktur/${encodeURIComponent(latestId)}`)}
            className="rounded-sm font-mono text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            {deal.sphId}
          </button>
        );
      },
    },
    {
      id: "perusahaan", header: "Perusahaan",
      accessorKey: "perusahaanNama", meta: { className: "min-w-64" },
    },
    {
      id: "tanggal", header: "Tanggal",
      cell: ({ row }) => tanggalID(row.original.latestFaktur?.tanggal ?? ""),
    },
    {
      id: "jatuhTempo", header: "Jatuh Tempo",
      cell: ({ row }) => tanggalID(row.original.latestFaktur?.jatuhTempo ?? ""),
    },
    {
      id: "termin", header: "Termin", meta: { mono: true },
      cell: ({ row }) => {
        const { termins } = row.original;
        const issued = termins.filter((t) => t.faktur?.tanggal !== "").length;
        return `${issued}/${termins.length}`;
      },
    },
    {
      id: "total", header: "Total Tagihan", meta: { mono: true },
      cell: ({ row }) => formatRupiah(row.original.totalAfterTax),
    },
    {
      id: "status", header: "Status",
      cell: ({ row }) => {
        const s = dealStatus(row.original);
        return <Badge variant={s.variant}>{s.label}</Badge>;
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ReceiptText className="size-5 text-muted-foreground" />
        <h1 className="text-xl font-semibold tracking-tight">Faktur</h1>
      </div>

      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <DataTable
          columns={columns}
          data={deals}
          loading={isLoading}
          searchColumn="perusahaanNama"
          searchPlaceholder="Cari perusahaan…"
          emptyMessage="Belum ada faktur"
          rowActions={false}
        />
      )}
    </div>
  );
}
