"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { FolderKanban, MoreHorizontal, FileText, Receipt, SlidersHorizontal } from "lucide-react";
import { DataTable } from "@/components/shared/data-table";
import { ErrorState } from "@/components/shared/error-state";
import { MultiSelectFilter, type MultiSelectOption } from "@/components/shared/multi-select-filter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useProyekList, useWorkflowStatuses } from "@/lib/query/proyek";
import { useKatalogList } from "@/lib/query/katalog";
import { useSession } from "@/lib/query/session";
import { isFinance, isClientPortal } from "@/lib/auth/rbac";
import type { Proyek } from "@/lib/schemas/proyek";

/** Same systemRole-based heuristic used across the Proyek module — status is
 * config-driven (no fixed enum), never a hardcoded label match. */
function statusVariant(systemRole: string | null): "info" | "warning" | "success" | "secondary" | "destructive" {
  if (systemRole === "SELESAI") return "success";
  if (systemRole === "BATAL") return "destructive";
  return "info";
}

function LayananCell({ names }: { names: string[] }) {
  const first = names[0];
  const rest = names.slice(1);
  if (!first) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="flex flex-wrap items-center gap-1">
      <Badge variant="secondary" className="text-xs">{first}</Badge>
      {rest.length > 0 && (
        <Popover>
          <PopoverTrigger asChild>
            <Badge variant="secondary" className="cursor-pointer text-xs">+{rest.length}</Badge>
          </PopoverTrigger>
          <PopoverContent side="bottom" align="start" className="w-auto max-w-72 p-2">
            <div className="flex flex-wrap gap-1">
              {names.map((n) => (
                <Badge key={n} variant="secondary" className="text-xs">{n}</Badge>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

function RowActions({ proyek }: { proyek: Proyek }) {
  const router = useRouter();
  const { data: session } = useSession();
  // Faktur nav is admin/keuangan/viewer (client portal, own company scoped
  // by RLS) — Sales/Tim Teknis have no Faktur access at all, matches nav.ts.
  const canSeeFaktur = isFinance(session) || isClientPortal(session);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="outline-none">
        <MoreHorizontal className="size-4 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {proyek.sphId && (
          <DropdownMenuItem onSelect={() => router.push(`/penawaran/${encodeURIComponent(proyek.sphId!)}`)}>
            <FileText className="size-3.5" />
            Lihat SPH
          </DropdownMenuItem>
        )}
        {canSeeFaktur && (
          <DropdownMenuItem onSelect={() => router.push(`/faktur?proyekId=${encodeURIComponent(proyek.id)}`)}>
            <Receipt className="size-3.5" />
            Lihat Faktur
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function ProyekPage() {
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useProyekList();
  const { data: katalogData } = useKatalogList();
  const { data: statusOptionsRaw = [] } = useWorkflowStatuses("proyek");
  const statusOptions: MultiSelectOption[] = statusOptionsRaw.map((s) => ({
    value: s.id, label: s.label, variant: statusVariant(s.systemRole),
  }));

  // Filter state
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [pendingStatus, setPendingStatus] = React.useState<string[]>([]);
  const [pendingLayanan, setPendingLayanan] = React.useState<string[]>([]);
  const [appliedStatus, setAppliedStatus] = React.useState<string[]>([]);
  const [appliedLayanan, setAppliedLayanan] = React.useState<string[]>([]);

  const hasFilter = appliedStatus.length > 0 || appliedLayanan.length > 0;
  const hasPending = pendingStatus.length > 0 || pendingLayanan.length > 0;
  const filterCount = (appliedStatus.length > 0 ? 1 : 0) + (appliedLayanan.length > 0 ? 1 : 0);

  // Full catalog of layanan (not only those already used by projects) so the
  // filter list is complete; union in any project-only names defensively.
  const layananOptions = React.useMemo<MultiSelectOption[]>(() => {
    const names = new Set<string>();
    (katalogData ?? []).forEach((l) => names.add(l.nama));
    (data ?? []).forEach((p) => p.layanan.forEach((l) => names.add(l.nama)));
    return Array.from(names)
      .sort((a, b) => a.localeCompare(b))
      .map((l) => ({ value: l, label: l }));
  }, [katalogData, data]);

  const openFilter = () => {
    setPendingStatus(appliedStatus);
    setPendingLayanan(appliedLayanan);
    setFilterOpen(true);
  };
  const applyFilter = () => {
    setAppliedStatus(pendingStatus);
    setAppliedLayanan(pendingLayanan);
    setFilterOpen(false);
  };
  const resetFilter = () => {
    setPendingStatus([]); setPendingLayanan([]);
    setAppliedStatus([]); setAppliedLayanan([]);
    setFilterOpen(false);
  };

  const filteredData = React.useMemo(() => {
    let base = data ?? [];
    if (appliedStatus.length > 0)
      base = base.filter((p) => p.statusId && appliedStatus.includes(p.statusId));
    if (appliedLayanan.length > 0)
      base = base.filter((p) => appliedLayanan.some((l) => p.layanan.some((pl) => pl.nama === l)));
    return base;
  }, [data, appliedStatus, appliedLayanan]);

  const columns: ColumnDef<Proyek>[] = [
    {
      accessorKey: "number", header: "No. Proyek", meta: { mono: true },
      cell: ({ row }) => (
        <button type="button"
          onClick={() => router.push(`/proyek/${encodeURIComponent(row.original.id)}`)}
          className="rounded-sm font-mono text-(--link) hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
          {row.original.number ?? "—"}
        </button>
      ),
    },
    {
      accessorKey: "sphNumber", header: "No. SPH", meta: { mono: true },
      cell: ({ row }) => row.original.sphNumber ?? "—",
    },
    { accessorKey: "perusahaanNama", header: "Perusahaan", meta: { className: "min-w-40" } },
    {
      accessorKey: "layanan", header: "Layanan",
      cell: ({ row }) => <LayananCell names={row.original.layanan.map((l) => l.nama)} />,
    },
    {
      accessorKey: "status", header: "Status", meta: { className: "text-center" },
      cell: ({ row }) => (
        <Badge variant={statusVariant(row.original.statusSystemRole)}>{row.original.status}</Badge>
      ),
    },
    {
      id: "actions", header: "", meta: { className: "w-10" },
      cell: ({ row }) => <RowActions proyek={row.original} />,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <FolderKanban className="size-5 text-muted-foreground" />
        <h1 className="text-xl font-semibold tracking-tight">Proyek</h1>
      </div>

      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <DataTable
          columns={columns}
          data={filteredData}
          loading={isLoading}
          searchColumns={["number", "perusahaanNama"]}
          searchPlaceholder="Cari No. Proyek atau perusahaan…"
          emptyMessage="Belum ada proyek"
          defaultSorting={[{ id: "number", desc: true }]}
          rowActions={false}
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

      <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Filter Proyek</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-1">
            {/* Status */}
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</p>
              <MultiSelectFilter
                options={statusOptions}
                value={pendingStatus}
                onChange={setPendingStatus}
                placeholder="Pilih status…"
                searchPlaceholder="Cari status…"
                noun="status"
              />
            </div>

            {/* Layanan */}
            {layananOptions.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Layanan</p>
                <MultiSelectFilter
                  options={layananOptions}
                  value={pendingLayanan}
                  onChange={setPendingLayanan}
                  placeholder="Pilih layanan…"
                  searchPlaceholder="Cari layanan…"
                  noun="layanan"
                />
              </div>
            )}
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
    </div>
  );
}
