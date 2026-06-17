"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import type { DateRange } from "react-day-picker";
import { id as idLocale } from "date-fns/locale";
import {
  ArrowRightLeft, CalendarIcon, MoreHorizontal, Plus, SlidersHorizontal, Trash2,
} from "lucide-react";
import { DataTable } from "@/components/shared/data-table";
import { ErrorState } from "@/components/shared/error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatRupiah } from "@/lib/format";
import { useArusKasList, useRemoveArusKas } from "@/lib/query/arus-kas";
import type { ArusKasEntry, ArusKasJenis, ArusKasKategori, ArusKasSumber } from "@/lib/schemas/arus-kas";

// ── Helpers ──────────────────────────────────────────────────────────────

function tanggalID(iso: string) {
  return iso
    ? new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
    : "—";
}

const KATEGORI_BADGE: Record<ArusKasKategori, { label: string; variant: "success" | "info" | "warning" | "secondary" | "outline" }> = {
  faktur:      { label: "Faktur",      variant: "success" },
  penggajian:  { label: "Penggajian",  variant: "info" },
  pajak:       { label: "Pajak",       variant: "warning" },
  bonus:       { label: "Bonus",       variant: "secondary" },
  operasional: { label: "Operasional", variant: "outline" },
  lainnya:     { label: "Lainnya",     variant: "secondary" },
};

const SUMBER_LABEL: Record<ArusKasSumber, { label: string; variant: "secondary" | "info" }> = {
  manual:              { label: "Manual",     variant: "secondary" },
  otomatis_faktur:     { label: "Otomatis",   variant: "info" },
  otomatis_penggajian: { label: "Otomatis",   variant: "info" },
  otomatis_pajak:      { label: "Otomatis",   variant: "info" },
};

const JENIS_OPTIONS: { value: ArusKasJenis; label: string }[] = [
  { value: "kredit", label: "Pemasukan (Kredit)" },
  { value: "debit", label: "Pengeluaran (Debit)" },
];

const KATEGORI_OPTIONS: { value: ArusKasKategori; label: string }[] = [
  { value: "faktur", label: "Faktur" },
  { value: "penggajian", label: "Penggajian" },
  { value: "pajak", label: "Pajak" },
  { value: "bonus", label: "Bonus" },
  { value: "operasional", label: "Operasional" },
  { value: "lainnya", label: "Lainnya" },
];

const SUMBER_OPTIONS: { value: "manual" | "otomatis"; label: string }[] = [
  { value: "manual", label: "Manual" },
  { value: "otomatis", label: "Otomatis" },
];

function isSumberMatch(sumber: ArusKasSumber, filter: "manual" | "otomatis"): boolean {
  return filter === "manual" ? sumber === "manual" : sumber.startsWith("otomatis");
}

// ── DateRange input (reused from Faktur pattern) ─────────────────────────

function DateRangeInput({
  value, onChange, placeholder = "Pilih rentang tanggal",
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

// ── Summary Cards ────────────────────────────────────────────────────────

function SummaryCards({ entries }: { entries: ArusKasEntry[] }) {
  const totalKredit = entries.filter((e) => e.jenis === "kredit").reduce((s, e) => s + e.jumlah, 0);
  const totalDebit = entries.filter((e) => e.jenis === "debit").reduce((s, e) => s + e.jumlah, 0);
  const saldo = totalKredit - totalDebit;

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="rounded-lg border p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Saldo</p>
        <p className={`mt-1 text-lg font-semibold font-mono tabular-nums ${saldo >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
          {formatRupiah(saldo)}
        </p>
      </div>
      <div className="rounded-lg border p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total Pemasukan</p>
        <p className="mt-1 text-lg font-semibold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
          {formatRupiah(totalKredit)}
        </p>
      </div>
      <div className="rounded-lg border p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total Pengeluaran</p>
        <p className="mt-1 text-lg font-semibold font-mono tabular-nums text-red-600 dark:text-red-400">
          {formatRupiah(totalDebit)}
        </p>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────

export default function ArusKasPage() {
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useArusKasList();
  const removeMutation = useRemoveArusKas();

  // Filter state
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [pendingJenis, setPendingJenis] = React.useState<ArusKasJenis[]>([]);
  const [pendingKategori, setPendingKategori] = React.useState<ArusKasKategori[]>([]);
  const [pendingSumber, setPendingSumber] = React.useState<("manual" | "otomatis")[]>([]);
  const [pendingTanggal, setPendingTanggal] = React.useState<DateRange | undefined>();
  const [appliedJenis, setAppliedJenis] = React.useState<ArusKasJenis[]>([]);
  const [appliedKategori, setAppliedKategori] = React.useState<ArusKasKategori[]>([]);
  const [appliedSumber, setAppliedSumber] = React.useState<("manual" | "otomatis")[]>([]);
  const [appliedTanggal, setAppliedTanggal] = React.useState<DateRange | undefined>();

  const hasDateFilter = !!(appliedTanggal?.from || appliedTanggal?.to);
  const hasFilter = appliedJenis.length > 0 || appliedKategori.length > 0 || appliedSumber.length > 0 || hasDateFilter;
  const hasPending = pendingJenis.length > 0 || pendingKategori.length > 0 || pendingSumber.length > 0 || !!(pendingTanggal?.from || pendingTanggal?.to);
  const filterCount = (appliedJenis.length > 0 ? 1 : 0) + (appliedKategori.length > 0 ? 1 : 0) + (appliedSumber.length > 0 ? 1 : 0) + (hasDateFilter ? 1 : 0);

  const openFilter = () => {
    setPendingJenis(appliedJenis);
    setPendingKategori(appliedKategori);
    setPendingSumber(appliedSumber);
    setPendingTanggal(appliedTanggal);
    setFilterOpen(true);
  };
  const applyFilter = () => {
    setAppliedJenis(pendingJenis);
    setAppliedKategori(pendingKategori);
    setAppliedSumber(pendingSumber);
    setAppliedTanggal(pendingTanggal);
    setFilterOpen(false);
  };
  const resetFilter = () => {
    setPendingJenis([]); setPendingKategori([]); setPendingSumber([]); setPendingTanggal(undefined);
    setAppliedJenis([]); setAppliedKategori([]); setAppliedSumber([]); setAppliedTanggal(undefined);
    setFilterOpen(false);
  };

  const toggleItem = <T,>(arr: T[], item: T): T[] =>
    arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];

  // Sort by tanggal descending, then apply filters
  const allEntries = React.useMemo(() => {
    const sorted = [...(data ?? [])].sort((a, b) => b.tanggal.localeCompare(a.tanggal));
    let filtered = sorted;
    if (appliedJenis.length > 0)
      filtered = filtered.filter((e) => appliedJenis.includes(e.jenis));
    if (appliedKategori.length > 0)
      filtered = filtered.filter((e) => appliedKategori.includes(e.kategori));
    if (appliedSumber.length > 0)
      filtered = filtered.filter((e) => appliedSumber.some((s) => isSumberMatch(e.sumber, s)));
    if (hasDateFilter)
      filtered = filtered.filter((e) => inRange(e.tanggal, appliedTanggal));
    return filtered;
  }, [data, appliedJenis, appliedKategori, appliedSumber, appliedTanggal, hasDateFilter]);

  const columns: ColumnDef<ArusKasEntry>[] = [
    {
      accessorKey: "tanggal", header: "Tanggal",
      cell: ({ row }) => tanggalID(row.original.tanggal),
    },
    {
      accessorKey: "id", header: "ID", meta: { mono: true },
    },
    {
      accessorKey: "keterangan", header: "Keterangan", meta: { className: "min-w-48" },
      cell: ({ row }) => {
        const e = row.original;
        const refPath = e.referensiId
          ? e.sumber === "otomatis_faktur"
            ? `/faktur/${encodeURIComponent(e.referensiId)}`
            : e.sumber === "otomatis_penggajian"
              ? `/penggajian/${encodeURIComponent(e.referensiId)}`
              : null
          : null;
        return (
          <div>
            <span>{e.keterangan}</span>
            {refPath && (
              <button
                type="button"
                onClick={() => router.push(refPath)}
                className="ml-2 text-xs text-[var(--link)] hover:underline font-mono"
              >
                {e.referensiLabel}
              </button>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "kategori", header: "Kategori",
      cell: ({ row }) => {
        const k = KATEGORI_BADGE[row.original.kategori];
        return <Badge variant={k.variant}>{k.label}</Badge>;
      },
    },
    {
      accessorKey: "sumber", header: "Sumber",
      cell: ({ row }) => {
        const s = SUMBER_LABEL[row.original.sumber];
        return <Badge variant={s.variant}>{s.label}</Badge>;
      },
    },
    {
      id: "pemasukan", header: "Pemasukan",
      meta: { align: "right", mono: true },
      cell: ({ row }) =>
        row.original.jenis === "kredit"
          ? <span className="text-emerald-600 dark:text-emerald-400">{formatRupiah(row.original.jumlah)}</span>
          : <span className="text-muted-foreground">—</span>,
    },
    {
      id: "pengeluaran", header: "Pengeluaran",
      meta: { align: "right", mono: true },
      cell: ({ row }) =>
        row.original.jenis === "debit"
          ? <span className="text-red-600 dark:text-red-400">{formatRupiah(row.original.jumlah)}</span>
          : <span className="text-muted-foreground">—</span>,
    },
    {
      id: "actions", header: "", meta: { collapse: true },
      cell: ({ row }) => {
        if (row.original.locked) return null;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-7">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="text-xs">
              <DropdownMenuItem
                className="text-destructive text-xs"
                onClick={() => removeMutation.mutate(row.original.id)}
              >
                <Trash2 className="size-3.5 mr-1.5" /> Hapus
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ArrowRightLeft className="size-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold tracking-tight">Arus Kas</h1>
        </div>
        <Button size="sm" onClick={() => router.push("/arus-kas/baru")}>
          <Plus className="size-4 mr-1.5" /> Tambah Transaksi
        </Button>
      </div>

      {!isLoading && !isError && <SummaryCards entries={allEntries} />}

      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <DataTable
          columns={columns}
          data={allEntries}
          loading={isLoading}
          searchColumns={["id", "keterangan"]}
          searchPlaceholder="Cari ID atau keterangan…"
          emptyMessage="Belum ada transaksi"
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

      {/* Filter Dialog */}
      <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader><DialogTitle>Filter Arus Kas</DialogTitle></DialogHeader>
          <div className="space-y-5 py-1">
            {/* Jenis */}
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Jenis</p>
              <div className="space-y-2">
                {JENIS_OPTIONS.map((o) => (
                  <label key={o.value} className="flex cursor-pointer items-center gap-2.5">
                    <Checkbox
                      checked={pendingJenis.includes(o.value)}
                      onCheckedChange={() => setPendingJenis((p) => toggleItem(p, o.value))}
                    />
                    <span className="text-sm">{o.label}</span>
                  </label>
                ))}
              </div>
            </div>
            {/* Kategori */}
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Kategori</p>
              <div className="space-y-2">
                {KATEGORI_OPTIONS.map((o) => (
                  <label key={o.value} className="flex cursor-pointer items-center gap-2.5">
                    <Checkbox
                      checked={pendingKategori.includes(o.value)}
                      onCheckedChange={() => setPendingKategori((p) => toggleItem(p, o.value))}
                    />
                    <Badge variant={KATEGORI_BADGE[o.value].variant} className="text-xs">{o.label}</Badge>
                  </label>
                ))}
              </div>
            </div>
            {/* Sumber */}
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Sumber</p>
              <div className="space-y-2">
                {SUMBER_OPTIONS.map((o) => (
                  <label key={o.value} className="flex cursor-pointer items-center gap-2.5">
                    <Checkbox
                      checked={pendingSumber.includes(o.value)}
                      onCheckedChange={() => setPendingSumber((p) => toggleItem(p, o.value))}
                    />
                    <span className="text-sm">{o.label}</span>
                  </label>
                ))}
              </div>
            </div>
            {/* Tanggal */}
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Tanggal</p>
              <DateRangeInput value={pendingTanggal} onChange={setPendingTanggal} />
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
