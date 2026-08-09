"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import {
  FileText, Plus, EllipsisIcon, SquarePenIcon, Trash2Icon,
  SendIcon, CircleCheckIcon, FileIcon, BanIcon, FolderKanban, SlidersHorizontal,
  CalendarIcon, EyeIcon, XCircleIcon,
} from "lucide-react";
import type { DateRange } from "react-day-picker";
import { id as idLocale } from "date-fns/locale";
import { toast } from "sonner";
import { DataTable } from "@/components/shared/data-table";
import { ErrorState } from "@/components/shared/error-state";
import { MultiSelectFilter, type MultiSelectOption } from "@/components/shared/multi-select-filter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { CancelPembatalanModal } from "@/components/shared/cancel-pembatalan-modal";
import { useCancelPembatalan } from "@/lib/query/pembatalan";
import { formatRupiah } from "@/lib/format";
import { totalPenawaran } from "@/lib/sph";
import { afterTaxAmount } from "@/lib/faktur";
import {
  usePenawaranList, useUpdatePenawaranStatus, useDeletePenawaran,
} from "@/lib/query/penawaran";
import { useDeleteFakturBySph } from "@/lib/query/faktur";
import { useProyekList, useDeleteProyekBySph } from "@/lib/query/proyek";
import { useSession } from "@/lib/query/session";
import { isClientPortal } from "@/lib/auth/rbac";
import type { Sph, SphStatus } from "@/lib/schemas/penawaran";

const STATUS: Record<SphStatus, { label: string; variant: "info" | "warning" | "success" | "destructive" | "secondary" }> = {
  draft:      { label: "Draf",       variant: "info" },
  terkirim:   { label: "Terkirim",   variant: "warning" },
  deal:       { label: "Disetujui",  variant: "success" },
  ditolak:    { label: "Ditolak",    variant: "destructive" },
  dibatalkan: { label: "Dibatalkan", variant: "secondary" },
};

const STATUS_DIALOG: Partial<Record<SphStatus, { title: string; description: string; action: string; destructive?: boolean }>> = {
  draft:      { title: "Ubah ke Draf?",       description: "Status penawaran akan dikembalikan ke Draf.",                               action: "Ubah ke Draf" },
  terkirim:   { title: "Ubah ke Terkirim?",   description: "Penawaran akan ditandai sebagai sudah dikirimkan ke klien.",                action: "Ubah ke Terkirim" },
  deal:       { title: "Ubah ke Disetujui?",  description: "Faktur termin akan dibuat otomatis.",  action: "Disetujui" },
  ditolak:    { title: "Tolak Penawaran?",     description: "Status berubah ke Ditolak.",          action: "Tolak", destructive: true },
};

function tanggalID(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric", month: "long", year: "numeric",
  });
}

const STATUS_OPTIONS: MultiSelectOption[] = (Object.keys(STATUS) as SphStatus[]).map((s) => ({
  value: s, label: STATUS[s].label, variant: STATUS[s].variant,
}));

export default function PenawaranPage() {
  const router = useRouter();
  const { data, isLoading, isError, refetch } = usePenawaranList();
  const { data: session } = useSession();
  const isClient = isClientPortal(session);
  const updateStatus    = useUpdatePenawaranStatus();
  const deletePenawaran  = useDeletePenawaran();
  const deleteFakturBySph = useDeleteFakturBySph();
  const deleteProyekBySph = useDeleteProyekBySph();
  const { data: proyekList } = useProyekList();
  const sphToProyekId = React.useMemo(() => {
    const map = new Map<string, string>();
    proyekList?.forEach((p) => { if (p.sphId) map.set(p.sphId, p.id); });
    return map;
  }, [proyekList]);

  const [statusTarget, setStatusTarget] = React.useState<{ sph: Sph; nextStatus: SphStatus } | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<Sph | null>(null);
  const [cancelTarget, setCancelTarget] = React.useState<Sph | null>(null);
  const cancelPembatalan = useCancelPembatalan();

  // Filter dialog
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [pendingStatus, setPendingStatus] = React.useState<SphStatus[]>([]);
  const [pendingRange, setPendingRange] = React.useState<DateRange | undefined>();
  const [appliedStatus, setAppliedStatus] = React.useState<SphStatus[]>([]);
  const [appliedRange, setAppliedRange] = React.useState<DateRange | undefined>();

  const hasFilter = appliedStatus.length > 0 || !!(appliedRange?.from || appliedRange?.to);
  const hasPending = pendingStatus.length > 0 || !!(pendingRange?.from || pendingRange?.to);
  const filterCount = appliedStatus.length + (appliedRange?.from || appliedRange?.to ? 1 : 0);

  const openFilter = () => {
    setPendingStatus(appliedStatus);
    setPendingRange(appliedRange);
    setFilterOpen(true);
  };
  const applyFilter = () => {
    setAppliedStatus(pendingStatus);
    setAppliedRange(pendingRange);
    setFilterOpen(false);
  };
  const resetFilter = () => {
    setPendingStatus([]); setPendingRange(undefined);
    setAppliedStatus([]); setAppliedRange(undefined);
    setFilterOpen(false);
  };


  const filteredData = React.useMemo(() => {
    let base = data ?? [];
    if (appliedStatus.length > 0)
      base = base.filter((sph) => appliedStatus.includes(sph.status));
    if (appliedRange?.from || appliedRange?.to) {
      base = base.filter((sph) => {
        const d = new Date(sph.tanggal + "T00:00:00");
        if (appliedRange.from && d < appliedRange.from) return false;
        if (appliedRange.to && d > appliedRange.to) return false;
        return true;
      });
    }
    return base;
  }, [data, appliedStatus, appliedRange]);

  const columns: ColumnDef<Sph>[] = [
    {
      accessorKey: "number", header: "No. SPH", meta: { mono: true },
      cell: ({ row }) => (
        <button
          type="button"
          onClick={() => router.push(`/penawaran/${encodeURIComponent(row.original.id)}`)}
          className="rounded-sm font-mono text-(--link) hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {row.original.number ?? row.original.id.slice(0, 8)}
        </button>
      ),
    },
    { accessorKey: "perusahaanNama", header: "Perusahaan", meta: { className: "min-w-64" } },
    { accessorKey: "tanggal", header: "Tanggal", cell: ({ row }) => tanggalID(row.original.tanggal) },
    {
      id: "total", header: "Total Penawaran", meta: { mono: true },
      accessorFn: (row) =>
        afterTaxAmount(totalPenawaran(row.items), row.ppnAktif, row.ppnPersen, row.pph23Aktif, row.pph23Persen),
      cell: ({ row }) => {
        const sph = row.original;
        const total = totalPenawaran(sph.items);
        return formatRupiah(afterTaxAmount(total, sph.ppnAktif, sph.ppnPersen, sph.pph23Aktif, sph.pph23Persen));
      },
    },
    {
      accessorKey: "status", header: "Status", meta: { className: "text-center" },
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

        // Client portal — a single view-only action, no status/edit/delete
        // menu at all (the write API already rejects all of it for viewer;
        // this just keeps the UI honest about what's actually possible).
        if (isClient) {
          return (
            <div className="flex justify-end">
              <Button variant="ghost" size="icon" className="size-8" aria-label="Lihat"
                onClick={() => router.push(`/penawaran/${encodeURIComponent(sph.id)}`)}>
                <EyeIcon className="size-4" />
              </Button>
            </div>
          );
        }

        return (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8" aria-label="Aksi baris">
                  <EllipsisIcon className="size-4" />
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

                {/* Ubah — never locked by status anymore, even Deal/Ditolak/Dibatalkan stay editable */}
                <DropdownMenuItem
                  onSelect={() => router.push(`/penawaran/${encodeURIComponent(sph.id)}`)}
                >
                  <SquarePenIcon className="mr-2 size-4" /> Ubah
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {/* Tolak → Ditolak — enabled only for terkirim */}
                <DropdownMenuItem
                  disabled={sph.status !== "terkirim"}
                  variant="destructive"
                  onSelect={(e) => { e.preventDefault(); setStatusTarget({ sph, nextStatus: "ditolak" }); }}
                >
                  <BanIcon className="mr-2 size-4" /> Tolak
                </DropdownMenuItem>

                {/* Batalkan — cascades to the linked Proyek + Faktur Induk too */}
                <DropdownMenuItem
                  disabled={isDibatalkan}
                  variant="destructive"
                  onSelect={(e) => { e.preventDefault(); setCancelTarget(sph); }}
                >
                  <XCircleIcon className="mr-2 size-4" /> Batalkan
                </DropdownMenuItem>

                {/* Hapus — disabled only when deal */}
                <DropdownMenuItem
                  disabled={isDeal}
                  variant="destructive"
                  onSelect={(e) => { e.preventDefault(); setDeleteTarget(sph); }}
                >
                  <Trash2Icon className="mr-2 size-4" /> Hapus
                </DropdownMenuItem>
                {isDeal && sphToProyekId.has(sph.id) && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onSelect={() => router.push(`/proyek/${encodeURIComponent(sphToProyekId.get(sph.id) ?? "")}`)}
                    >
                      <FolderKanban className="mr-2 size-4" /> Lihat Proyek
                    </DropdownMenuItem>
                  </>
                )}
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
        {!isClient && (
          <Button onClick={() => router.push("/penawaran/baru")}>
            <Plus className="size-4" /> Buat SPH
          </Button>
        )}
      </div>

      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <DataTable
          columns={columns}
          data={filteredData}
          loading={isLoading}
          searchColumns={["number", "perusahaanNama"]}
          searchPlaceholder="Cari No. SPH atau perusahaan…"
          emptyMessage="Belum ada penawaran"
          defaultSorting={[{ id: "tanggal", desc: true }]}
          rowActions={false}
          compact
          toolbarActions={
            <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={openFilter}>
              <SlidersHorizontal className="size-3.5" />
              Filter
              {hasFilter && (
                <Badge variant="secondary" className="px-1.5 py-0 text-xs">{filterCount}</Badge>
              )}
            </Button>
          }
        />
      )}

      {/* Filter dialog */}
      <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Filter Penawaran</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-1">
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</p>
              <MultiSelectFilter
                options={STATUS_OPTIONS}
                value={pendingStatus}
                onChange={(v) => setPendingStatus(v as SphStatus[])}
                placeholder="Pilih status…"
                searchPlaceholder="Cari status…"
                noun="status"
              />
            </div>

            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Tanggal</p>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="flex h-9 w-full items-center gap-2 rounded-md border border-input bg-background px-3 text-sm text-left focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <CalendarIcon className="size-3.5 shrink-0 text-muted-foreground" />
                    {pendingRange?.from ? (
                      pendingRange.to ? (
                        <span>
                          {pendingRange.from.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                          {" — "}
                          {pendingRange.to.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                      ) : (
                        <span>{pendingRange.from.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</span>
                      )
                    ) : (
                      <span className="text-muted-foreground">Pilih rentang tanggal</span>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={pendingRange}
                    onSelect={setPendingRange}
                    locale={idLocale}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <DialogFooter className="flex-row items-center gap-2">
            <Button
              variant={hasPending ? "ghost" : "outline"}
              size="sm"
              className="mr-auto"
              onClick={resetFilter}
            >
              {hasPending ? "Reset" : "Tutup"}
            </Button>
            <Button size="sm" onClick={applyFilter}>Terapkan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm: Status change (Terkirim / Disetujui / Tolak) */}
      <AlertDialog open={!!statusTarget} onOpenChange={(o) => !o && setStatusTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dialogInfo?.title ?? ""}</AlertDialogTitle>
            <AlertDialogDescription>{dialogInfo?.description ?? ""}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              variant={dialogInfo?.destructive ? "destructive" : "default"}
              disabled={updateStatus.isPending}
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

      {/* Batalkan — cascades to the linked Proyek + Faktur Induk too */}
      <CancelPembatalanModal
        open={!!cancelTarget}
        onOpenChange={(o) => { if (!o) setCancelTarget(null); }}
        isPending={cancelPembatalan.isPending}
        onConfirm={({ alasan, biayaAdministrasi }) => {
          if (!cancelTarget) return;
          cancelPembatalan.mutate(
            { sphId: cancelTarget.id, alasan, biayaAdministrasi },
            { onSuccess: () => setCancelTarget(null) },
          );
        }}
      />

      {/* Confirm: Hapus. Faktur/Proyek stay mock — this only cleans up their
          still-mock fixture entries referencing this SPH id; it's not a real
          cascade against the deleted quotation, which is real. */}
      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}
        entityLabel="Penawaran"
        target={deleteTarget?.number ?? deleteTarget?.id}
        description="Faktur dan proyek contoh terkait juga akan dibersihkan. Tindakan ini tidak dapat dibatalkan."
        loading={deletePenawaran.isPending || deleteFakturBySph.isPending || deleteProyekBySph.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;
          const sphId = deleteTarget.id;
          const label = deleteTarget.number ?? sphId;
          const doDelete = () => {
            deletePenawaran.mutate(sphId, {
              onSuccess: () => {
                toast.success(`${label} dihapus.`);
                setDeleteTarget(null);
              },
            });
          };
          const deleteProyekThenSph = () => {
            deleteProyekBySph.mutate(sphId, { onSuccess: doDelete });
          };
          deleteFakturBySph.mutate(sphId, { onSuccess: deleteProyekThenSph });
        }}
      />
    </div>
  );
}
