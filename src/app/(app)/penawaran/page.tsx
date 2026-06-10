"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import {
  FileText, Plus, EllipsisVerticalIcon, SquarePenIcon, Trash2Icon,
  SendIcon, CircleCheckIcon, FileIcon, BanIcon,
} from "lucide-react";
import { toast } from "sonner";
import { DataTable } from "@/components/shared/data-table";
import { ErrorState } from "@/components/shared/error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatRupiah } from "@/lib/format";
import { totalPenawaran } from "@/lib/sph";
import {
  usePenawaranList, useUpdatePenawaranStatus, useDeletePenawaran,
} from "@/lib/query/penawaran";
import { useDeleteFakturBySph } from "@/lib/query/faktur";
import type { Sph, SphStatus } from "@/lib/schemas/penawaran";

const STATUS: Record<SphStatus, { label: string; variant: "info" | "warning" | "success" | "destructive" | "secondary" }> = {
  draft:      { label: "Draf",       variant: "info" },
  terkirim:   { label: "Terkirim",   variant: "warning" },
  deal:       { label: "Disetujui",  variant: "success" },
  ditolak:    { label: "Ditolak",    variant: "destructive" },
  dibatalkan: { label: "Dibatalkan", variant: "secondary" },
};

const STATUS_DIALOG: Record<SphStatus, { title: string; description: string; action: string; destructive?: boolean }> = {
  draft:      { title: "Ubah ke Draf?",       description: "Status penawaran akan dikembalikan ke Draf.",                               action: "Ubah ke Draf" },
  terkirim:   { title: "Ubah ke Terkirim?",   description: "Penawaran akan ditandai sebagai sudah dikirimkan ke klien.",                action: "Ubah ke Terkirim" },
  deal:       { title: "Ubah ke Disetujui?",  description: "Faktur termin akan dibuat otomatis. Tindakan ini tidak dapat dibatalkan.",  action: "Disetujui" },
  ditolak:    { title: "Batalkan penawaran?",  description: "Status berubah ke Ditolak. Tindakan ini tidak dapat dibatalkan.",          action: "Batalkan", destructive: true },
  dibatalkan: { title: "Batalkan penawaran?",  description: "Status berubah ke Dibatalkan.",                                            action: "Batalkan", destructive: true },
};

function tanggalID(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric", month: "long", year: "numeric",
  });
}

export default function PenawaranPage() {
  const router = useRouter();
  const { data, isLoading, isError, refetch } = usePenawaranList();
  const updateStatus    = useUpdatePenawaranStatus();
  const deletePenawaran = useDeletePenawaran();
  const deleteFakturBySph = useDeleteFakturBySph();

  const [statusTarget, setStatusTarget] = React.useState<{ sph: Sph; nextStatus: SphStatus } | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<Sph | null>(null);

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
        const isDeal       = sph.status === "deal";
        const isDibatalkan = sph.status === "dibatalkan";
        const isDitolak    = sph.status === "ditolak";
        const isLocked     = isDeal || isDibatalkan || isDitolak;

        return (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8" aria-label="Aksi baris">
                  <EllipsisVerticalIcon className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="text-xs font-semibold">Status</DropdownMenuLabel>

                {/* Draf — always disabled (current state or can't go back) */}
                <DropdownMenuItem disabled>
                  <FileIcon className="mr-2 size-4" /> Draf
                </DropdownMenuItem>

                {/* Terkirim — enabled only from draft */}
                <DropdownMenuItem
                  disabled={sph.status !== "draft"}
                  onSelect={() => setStatusTarget({ sph, nextStatus: "terkirim" })}
                >
                  <SendIcon className="mr-2 size-4" /> Terkirim
                </DropdownMenuItem>

                {/* Disetujui — enabled only from terkirim */}
                <DropdownMenuItem
                  disabled={sph.status !== "terkirim"}
                  onSelect={() => setStatusTarget({ sph, nextStatus: "deal" })}
                >
                  <CircleCheckIcon className="mr-2 size-4" /> Disetujui
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {/* Ubah — disabled when locked */}
                <DropdownMenuItem
                  disabled={isLocked}
                  onSelect={() => router.push(`/penawaran/${encodeURIComponent(sph.id)}`)}
                >
                  <SquarePenIcon className="mr-2 size-4" /> Ubah
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {/* Batalkan → Ditolak — enabled only for draft or terkirim */}
                <DropdownMenuItem
                  disabled={sph.status !== "draft" && sph.status !== "terkirim"}
                  variant="destructive"
                  onSelect={(e) => { e.preventDefault(); setStatusTarget({ sph, nextStatus: "ditolak" }); }}
                >
                  <BanIcon className="mr-2 size-4" /> Batalkan
                </DropdownMenuItem>

                {/* Hapus — disabled only when deal */}
                <DropdownMenuItem
                  disabled={isDeal}
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

  const dialogInfo = statusTarget ? STATUS_DIALOG[statusTarget.nextStatus] : null;

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

      {/* Confirm: Status change (Terkirim / Disetujui / Batalkan) */}
      <AlertDialog open={!!statusTarget} onOpenChange={(o) => !o && setStatusTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dialogInfo?.title}</AlertDialogTitle>
            <AlertDialogDescription>{dialogInfo?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              variant={dialogInfo?.destructive ? "destructive" : "default"}
              onClick={() => {
                if (!statusTarget) return;
                updateStatus.mutate(
                  { id: statusTarget.sph.id, status: statusTarget.nextStatus },
                  {
                    onSuccess: () => {
                      toast.success(`Status diubah: ${STATUS[statusTarget.nextStatus].label}`);
                      setStatusTarget(null);
                    },
                  },
                );
              }}
            >
              {dialogInfo?.action}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm: Hapus */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus {deleteTarget?.id}?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.status === "dibatalkan"
                ? "Semua faktur terkait juga akan dihapus. Tindakan ini tidak dapat dibatalkan."
                : "Tindakan ini tidak dapat dibatalkan."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (!deleteTarget) return;
                const doDelete = () => {
                  deletePenawaran.mutate(deleteTarget.id, {
                    onSuccess: () => {
                      toast.success(`${deleteTarget.id} dihapus.`);
                      setDeleteTarget(null);
                    },
                  });
                };
                if (deleteTarget.status === "dibatalkan") {
                  deleteFakturBySph.mutate(deleteTarget.id, { onSuccess: doDelete });
                } else {
                  doDelete();
                }
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
