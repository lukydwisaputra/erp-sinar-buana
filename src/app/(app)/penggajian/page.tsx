"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { CalendarIcon, ChevronLeft, ChevronRight, Wallet, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { DataTable } from "@/components/shared/data-table";
import { ErrorState } from "@/components/shared/error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatRupiah } from "@/lib/format";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useBatchList, useDeleteBatch } from "@/lib/query/penggajian";
import { calcSlip, type PenggajianBatch } from "@/lib/schemas/penggajian";

function periodStr(p: PenggajianBatch["periode"]) {
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  return `${fmt(p.mulai)} – ${fmt(p.selesai)}`;
}

function bulanKey(periode: PenggajianBatch["periode"]) {
  const d = new Date(periode.mulai);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function bulanLabel(key: string) {
  const [y, m] = key.split("-");
  const d = new Date(Number(y), Number(m) - 1);
  return d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
}

const BULAN_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

function MonthPicker({
  value,
  onChange,
}: {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [year, setYear] = React.useState(() => value?.getFullYear() ?? new Date().getFullYear());
  const label = value
    ? value.toLocaleDateString("id-ID", { month: "long", year: "numeric" })
    : "Semua bulan";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-9 justify-start gap-2 text-sm font-normal">
          <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
          {label}
          {value && (
            <span
              role="button"
              className="ml-auto rounded-full p-0.5 hover:bg-muted"
              onClick={(e) => { e.stopPropagation(); onChange(undefined); }}
            >
              <X className="size-3" />
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        <div className="flex items-center justify-between mb-2">
          <Button variant="ghost" size="icon" className="size-7" onClick={() => setYear((y) => y - 1)}>
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-sm font-medium">{year}</span>
          <Button variant="ghost" size="icon" className="size-7" onClick={() => setYear((y) => y + 1)}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <div className="grid grid-cols-4 gap-1">
          {BULAN_NAMES.map((name, i) => {
            const selected = value && value.getFullYear() === year && value.getMonth() === i;
            return (
              <Button
                key={i}
                variant={selected ? "default" : "ghost"}
                size="sm"
                className="h-8 text-xs"
                onClick={() => {
                  onChange(new Date(year, i, 1));
                  setOpen(false);
                }}
              >
                {name}
              </Button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function PenggajianPage() {
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useBatchList();
  const deleteBatch = useDeleteBatch();
  const [filterMonth, setFilterMonth] = React.useState<Date | undefined>();
  const [deleteTarget, setDeleteTarget] = React.useState<PenggajianBatch | null>(null);

  const filterKey = filterMonth
    ? `${filterMonth.getFullYear()}-${String(filterMonth.getMonth() + 1).padStart(2, "0")}`
    : null;

  const rows = React.useMemo(() => {
    const all = (data ?? []).map((b) => ({ ...b, bulan: bulanKey(b.periode) }));
    if (!filterKey) return all;
    return all.filter((r) => r.bulan === filterKey);
  }, [data, filterKey]);

  const columns: ColumnDef<PenggajianBatch & { bulan: string }>[] = [
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
      id: "periode", header: "Periode",
      accessorFn: (row) => row.periode.mulai,
      cell: ({ row }) => periodStr(row.original.periode),
    },
    {
      accessorKey: "bulan", header: "Bulan",
      cell: ({ row }) => bulanLabel(row.original.bulan),
    },
    {
      id: "totalKotor", header: "Total Gaji Kotor",
      meta: { align: "right", mono: true },
      accessorFn: (row) => row.slips.reduce((sum, s) => sum + calcSlip(s).penggajianKotor, 0),
      cell: ({ row }) => {
        const total = row.original.slips.reduce((sum, s) => sum + calcSlip(s).penggajianKotor, 0);
        return formatRupiah(total);
      },
    },
    {
      id: "totalBersih", header: "Total Gaji Bersih",
      meta: { align: "right", mono: true },
      accessorFn: (row) => row.slips.reduce((sum, s) => sum + calcSlip(s).penggajianBersih, 0),
      cell: ({ row }) => {
        const total = row.original.slips.reduce((sum, s) => sum + calcSlip(s).penggajianBersih, 0);
        return formatRupiah(total);
      },
    },
    {
      id: "sudahDibayar", header: "Sudah Dibayar",
      meta: { className: "text-center" },
      accessorFn: (row) => row.slips.filter((s) => s.status === "sudah_dibayar").length,
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
      id: "actions", header: "", enableSorting: false, meta: { collapse: true },
      cell: ({ row }) => (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            aria-label="Hapus penggajian"
            onClick={() => setDeleteTarget(row.original)}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet className="size-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold tracking-tight">Penggajian</h1>
        </div>
        <Button onClick={() => router.push("/penggajian/baru")}>
          <Plus className="size-4 mr-1.5" /> Buat Penggajian
        </Button>
      </div>

      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          loading={isLoading}
          searchColumn="id"
          searchPlaceholder="Cari ID penggajian…"
          toolbarActions={<MonthPicker value={filterMonth} onChange={setFilterMonth} />}
          emptyMessage="Belum ada penggajian"
          rowActions={false}
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus {deleteTarget?.id}?</AlertDialogTitle>
            <AlertDialogDescription>
              Penggajian beserta seluruh slip gajinya akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteBatch.isPending}
              onClick={() => {
                if (!deleteTarget) return;
                deleteBatch.mutate(deleteTarget.id, {
                  onSuccess: () => {
                    toast.success(`${deleteTarget.id} dihapus.`);
                    setDeleteTarget(null);
                  },
                });
              }}
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
