"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import {
  FileText, Plus, EllipsisVerticalIcon, SquarePenIcon, Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";
import { DataTable } from "@/components/shared/data-table";
import { ErrorState } from "@/components/shared/error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatRupiah } from "@/lib/format";
import { totalPenawaran } from "@/lib/sph";
import { usePenawaranList, useUpdatePenawaranStatus } from "@/lib/query/penawaran";
import type { Sph, SphStatus } from "@/lib/schemas/penawaran";

const STATUS: Record<SphStatus, { label: string; variant: "info" | "warning" | "success" }> = {
  draft: { label: "Draft", variant: "info" },
  terkirim: { label: "Leads - Terkirim", variant: "warning" },
  deal: { label: "Convert - Deal", variant: "success" },
};

const NEXT_STATUS: Partial<Record<SphStatus, { label: string; next: SphStatus }>> = {
  draft: { label: "Tandai Terkirim", next: "terkirim" },
  terkirim: { label: "Tandai Deal", next: "deal" },
};

function tanggalID(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric", month: "long", year: "numeric",
  });
}

export default function PenawaranPage() {
  const router = useRouter();
  const { data, isLoading, isError, refetch } = usePenawaranList();
  const updateStatus = useUpdatePenawaranStatus();

  const [deleteTarget, setDeleteTarget] = React.useState<Sph | null>(null);
  const [dealTarget, setDealTarget] = React.useState<Sph | null>(null);

  const columns: ColumnDef<Sph>[] = [
    {
      accessorKey: "id", header: "No. SPH", meta: { mono: true },
      cell: ({ row }) => (
        <button
          type="button"
          onClick={() => router.push(`/penawaran/${encodeURIComponent(row.original.id)}`)}
          className="rounded-sm font-mono text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {row.original.id}
        </button>
      ),
    },
    { accessorKey: "perusahaanNama", header: "Perusahaan", meta: { className: "min-w-64" } },
    { accessorKey: "tanggal", header: "Tanggal", cell: ({ row }) => tanggalID(row.original.tanggal) },
    {
      id: "total", header: "Total Penawaran", meta: { mono: true },
      cell: ({ row }) => formatRupiah(totalPenawaran(row.original.items)),
    },
    {
      accessorKey: "status", header: "Status",
      cell: ({ row }) => {
        const s = STATUS[row.original.status];
        return <Badge variant={s.variant}>{s.label}</Badge>;
      },
    },
    {
      id: "actions", header: "", enableSorting: false,
      meta: { align: "right", collapse: true },
      cell: ({ row }) => {
        const sph = row.original;
        if (sph.status === "deal") return null;
        const nextAction = NEXT_STATUS[sph.status];
        return (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8" aria-label="Aksi baris">
                  <EllipsisVerticalIcon className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                {nextAction && (
                  <DropdownMenuItem
                    onSelect={() => {
                      if (nextAction.next === "deal") {
                        setDealTarget(sph);
                      } else {
                        updateStatus.mutate(
                          { id: sph.id, status: nextAction.next },
                          { onSuccess: () => toast.success(`Status diubah: ${nextAction.label}`) },
                        );
                      }
                    }}
                  >
                    {nextAction.label}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onSelect={() => router.push(`/penawaran/${encodeURIComponent(sph.id)}`)}
                >
                  <SquarePenIcon className="mr-2 size-4" /> Ubah
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={(e) => { e.preventDefault(); setDeleteTarget(sph); }}
                >
                  <Trash2Icon className="mr-2 size-4" /> Hapus
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FileText className="size-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold tracking-tight">Penawaran</h1>
        </div>
        <Button onClick={() => router.push("/penawaran/baru")}>
          <Plus className="size-4" /> Buat SPH
        </Button>
      </div>

      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <DataTable
          columns={columns}
          data={data ?? []}
          loading={isLoading}
          searchColumn="perusahaanNama"
          searchPlaceholder="Cari perusahaan…"
          emptyMessage="Belum ada penawaran"
          rowActions={false}
        />
      )}

      {/* Confirm: Hapus */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus {deleteTarget?.id}?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. (Demo: data tidak benar-benar dihapus.)
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                toast.success("Demo: data tidak dihapus");
                setDeleteTarget(null);
              }}
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm: Tandai Deal */}
      <AlertDialog open={!!dealTarget} onOpenChange={(o) => !o && setDealTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tandai sebagai Deal?</AlertDialogTitle>
            <AlertDialogDescription>
              Mengubah ke Deal akan membuat faktur otomatis untuk{" "}
              {dealTarget?.termin.length ?? 0} termin. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!dealTarget) return;
                updateStatus.mutate(
                  { id: dealTarget.id, status: "deal" },
                  {
                    onSuccess: () => {
                      toast.success("SPH diubah ke Deal. Faktur termin dibuat otomatis.");
                      setDealTarget(null);
                    },
                  },
                );
              }}
            >
              Tandai Deal
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
