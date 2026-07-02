"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { ReceiptText, SlidersHorizontal, CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { id as idLocale } from "date-fns/locale";
import { DataTable } from "@/components/shared/data-table";
import { ErrorState } from "@/components/shared/error-state";
import { MultiSelectFilter, type MultiSelectOption } from "@/components/shared/multi-select-filter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatRupiah } from "@/lib/format";
import { groupFakturByDeal, getDealStatus } from "@/lib/faktur";
import type { DealRekap, DealStatus } from "@/lib/faktur";
import { useFakturList } from "@/lib/query/faktur";

const DEAL_STATUS: Record<DealStatus, { label: string; variant: "info" | "warning" | "success" | "destructive" | "secondary" }> = {
  draft:       { label: "Draf",        variant: "info" },
  belum_lunas: { label: "Belum Lunas", variant: "warning" },
  jatuh_tempo: { label: "Jatuh Tempo", variant: "destructive" },
  lunas:       { label: "Lunas",       variant: "success" },
  dibatalkan:  { label: "Dibatalkan",  variant: "secondary" },
};

const DEAL_STATUS_OPTIONS: MultiSelectOption[] = (Object.keys(DEAL_STATUS) as DealStatus[]).map((s) => ({
  value: s, label: DEAL_STATUS[s].label, variant: DEAL_STATUS[s].variant,
}));

function tanggalID(iso: string) {
  return iso
    ? new Date(iso).toLocaleDateString("id-ID", {
        day: "numeric", month: "long", year: "numeric",
      })
    : "—";
}

function DateRangeInput({
  value,
  onChange,
  placeholder = "Pilih rentang tanggal",
}: {
  value: DateRange | undefined;
  onChange: (r: DateRange | undefined) => void;
  placeholder?: string;
}) {
  const fmt = (d: Date) => d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-9 w-full items-center gap-2 rounded-md border border-input bg-background px-3 text-left text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <CalendarIcon className="size-3.5 shrink-0 text-muted-foreground" />
          {value?.from ? (
            value.to ? (
              <span>{fmt(value.from)} — {fmt(value.to)}</span>
            ) : (
              <span>{fmt(value.from)}</span>
            )
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="range" selected={value} onSelect={onChange} locale={idLocale} />
      </PopoverContent>
    </Popover>
  );
}

function inRange(iso: string | undefined, range: DateRange | undefined): boolean {
  if (!range?.from && !range?.to) return true;
  if (!iso) return false;
  const d = new Date(iso + "T00:00:00");
  if (range.from && d < range.from) return false;
  if (range.to && d > range.to) return false;
  return true;
}

export default function FakturPage() {
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useFakturList();
  const deals = data ? groupFakturByDeal(data) : [];

  // Filter state
  const [filterOpen, setFilterOpen]       = React.useState(false);
  const [pendingStatus, setPendingStatus] = React.useState<DealStatus[]>([]);
  const [pendingTanggal, setPendingTanggal]     = React.useState<DateRange | undefined>();
  const [pendingJatuhTempo, setPendingJatuhTempo] = React.useState<DateRange | undefined>();
  const [appliedStatus, setAppliedStatus] = React.useState<DealStatus[]>([]);
  const [appliedTanggal, setAppliedTanggal]     = React.useState<DateRange | undefined>();
  const [appliedJatuhTempo, setAppliedJatuhTempo] = React.useState<DateRange | undefined>();

  const hasDateFilter = !!(appliedTanggal?.from || appliedTanggal?.to);
  const hasJTFilter   = !!(appliedJatuhTempo?.from || appliedJatuhTempo?.to);
  const hasFilter     = appliedStatus.length > 0 || hasDateFilter || hasJTFilter;
  const hasPending    = pendingStatus.length > 0 ||
    !!(pendingTanggal?.from || pendingTanggal?.to) ||
    !!(pendingJatuhTempo?.from || pendingJatuhTempo?.to);
  const filterCount   = (appliedStatus.length > 0 ? 1 : 0) + (hasDateFilter ? 1 : 0) + (hasJTFilter ? 1 : 0);

  const openFilter = () => {
    setPendingStatus(appliedStatus);
    setPendingTanggal(appliedTanggal);
    setPendingJatuhTempo(appliedJatuhTempo);
    setFilterOpen(true);
  };
  const applyFilter = () => {
    setAppliedStatus(pendingStatus);
    setAppliedTanggal(pendingTanggal);
    setAppliedJatuhTempo(pendingJatuhTempo);
    setFilterOpen(false);
  };
  const resetFilter = () => {
    setPendingStatus([]); setPendingTanggal(undefined); setPendingJatuhTempo(undefined);
    setAppliedStatus([]); setAppliedTanggal(undefined); setAppliedJatuhTempo(undefined);
    setFilterOpen(false);
  };

  const filteredDeals = React.useMemo(() => {
    let base = deals;
    if (appliedStatus.length > 0)
      base = base.filter((d) => appliedStatus.includes(getDealStatus(d)));
    if (hasDateFilter)
      base = base.filter((d) => inRange(d.latestFaktur?.tanggal, appliedTanggal));
    if (hasJTFilter)
      base = base.filter((d) => inRange(d.latestFaktur?.jatuhTempo, appliedJatuhTempo));
    return base;
  }, [deals, appliedStatus, appliedTanggal, appliedJatuhTempo, hasDateFilter, hasJTFilter]);

  const columns: ColumnDef<DealRekap>[] = [
    {
      id: "sphId", header: "No. Faktur", meta: { mono: true },
      accessorFn: (row) => row.baseInvId ?? row.sphId,
      cell: ({ row }) => {
        const deal = row.original;
        const display = deal.baseInvId ?? deal.sphId;
        const lastTermin = deal.termins[deal.termins.length - 1];
        const targetId = lastTermin?.faktur?.id ?? deal.latestFaktur?.id;
        if (!targetId) return <span className="font-mono text-muted-foreground">{display}</span>;
        return (
          <button
            type="button"
            onClick={() => router.push(`/faktur/${encodeURIComponent(targetId)}`)}
            className="rounded-sm font-mono text-[var(--link)] hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            {display}
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
      accessorFn: (row) => row.latestFaktur?.tanggal ?? "",
      cell: ({ row }) => tanggalID(row.original.latestFaktur?.tanggal ?? ""),
    },
    {
      id: "jatuhTempo", header: "Jatuh Tempo",
      accessorFn: (row) => row.latestFaktur?.jatuhTempo ?? "",
      cell: ({ row }) => tanggalID(row.original.latestFaktur?.jatuhTempo ?? ""),
    },
    {
      id: "termin", header: "Termin", meta: { mono: true },
      accessorFn: (row) => row.termins.filter((t) => t.faktur?.tanggal !== "").length,
      cell: ({ row }) => {
        const { termins } = row.original;
        const issued = termins.filter((t) => t.faktur?.tanggal !== "").length;
        return `${issued}/${termins.length}`;
      },
    },
    {
      id: "total", header: "Total Tagihan", meta: { mono: true },
      accessorFn: (row) => row.totalAfterTax,
      cell: ({ row }) => formatRupiah(row.original.totalAfterTax),
    },
    {
      id: "status", header: "Status", meta: { className: "text-center" },
      accessorFn: (row) => getDealStatus(row),
      cell: ({ row }) => {
        const s = DEAL_STATUS[getDealStatus(row.original)];
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
          data={filteredDeals}
          loading={isLoading}
          searchColumns={["sphId", "perusahaanNama"]}
          searchPlaceholder="Cari No. Faktur atau perusahaan…"
          emptyMessage="Belum ada faktur"
          defaultSorting={[{ id: "tanggal", desc: true }]}
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
            <DialogTitle>Filter Faktur</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-1">
            {/* Status */}
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</p>
              <MultiSelectFilter
                options={DEAL_STATUS_OPTIONS}
                value={pendingStatus}
                onChange={(v) => setPendingStatus(v as DealStatus[])}
                placeholder="Pilih status…"
                searchPlaceholder="Cari status…"
                noun="status"
              />
            </div>

            {/* Tanggal */}
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Tanggal</p>
              <DateRangeInput value={pendingTanggal} onChange={setPendingTanggal} />
            </div>

            {/* Jatuh Tempo */}
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Jatuh Tempo</p>
              <DateRangeInput value={pendingJatuhTempo} onChange={setPendingJatuhTempo} placeholder="Pilih rentang jatuh tempo" />
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
    </div>
  );
}
