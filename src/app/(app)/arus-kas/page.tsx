"use client";
import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { DateRange } from "react-day-picker";
import { id as idLocale } from "date-fns/locale";
import { ArrowRightLeft, CalendarIcon, SlidersHorizontal, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { DataTable } from "@/components/shared/data-table";
import { ErrorState } from "@/components/shared/error-state";
import { MultiSelectFilter, type MultiSelectOption } from "@/components/shared/multi-select-filter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import {
  ChartContainer, ChartTooltip, ChartTooltipContent,
  ChartLegend, ChartLegendContent, type ChartConfig,
} from "@/components/ui/chart";
import { formatRupiah } from "@/lib/format";
import { useArusKasList } from "@/lib/query/arus-kas";
import type { ArusKasEntry, ArusKasJenis, ArusKasSumber } from "@/lib/schemas/arus-kas";

// ── Helpers ──────────────────────────────────────────────────────────────

function tanggalID(iso: string) {
  return iso
    ? new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
    : "—";
}

const KATEGORI_VARIANT: Record<string, "success" | "info" | "warning" | "secondary"> = {
  Faktur: "success",
  Penggajian: "info",
  Pajak: "warning",
  BPJS: "warning",
  Bonus: "secondary",
};

function getKategoriBadge(k: string) {
  return { label: k, variant: KATEGORI_VARIANT[k] ?? "secondary" as const };
}

const SUMBER_LABEL: Record<ArusKasSumber, { label: string; variant: "secondary" | "info" }> = {
  manual:     { label: "Manual",   variant: "secondary" },
  faktur:     { label: "Otomatis", variant: "info" },
  penggajian: { label: "Otomatis", variant: "info" },
  pajak:      { label: "Otomatis", variant: "info" },
};

const JENIS_OPTIONS: { value: ArusKasJenis; label: string }[] = [
  { value: "kredit", label: "Pemasukan (Kredit)" },
  { value: "debit", label: "Pengeluaran (Debit)" },
];

const SUMBER_OPTIONS: { value: ArusKasSumber; label: string }[] = [
  { value: "manual", label: "Manual" },
  { value: "faktur", label: "Otomatis — Faktur" },
  { value: "penggajian", label: "Otomatis — Penggajian" },
  { value: "pajak", label: "Otomatis — Pajak" },
];

// ── DateRange input ───────────────────────────────────────────────────────

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

// ── Chart helpers ─────────────────────────────────────────────────────────

const NOW = new Date();
const CURRENT_YEAR = NOW.getFullYear();
const CURRENT_MONTH = NOW.getMonth() + 1; // 1-based

const lineChartConfig = {
  pemasukan:   { label: "Pemasukan",   color: "var(--chart-1)" },
  pengeluaran: { label: "Pengeluaran", color: "var(--chart-5)" },
} satisfies ChartConfig;

function buildLineData(entries: ArusKasEntry[], dateRange?: DateRange) {
  let sy: number, sm: number, ey: number, em: number;
  if (dateRange?.from || dateRange?.to) {
    const from = dateRange.from ?? dateRange.to!;
    const to   = dateRange.to   ?? dateRange.from!;
    sy = from.getFullYear(); sm = from.getMonth() + 1;
    ey = to.getFullYear();   em = to.getMonth() + 1;
  } else {
    sy = CURRENT_YEAR; sm = 1;
    ey = CURRENT_YEAR; em = CURRENT_MONTH;
  }

  const multiYear = sy !== ey;
  const monthMap = new Map<string, { bulan: string; pemasukan: number; pengeluaran: number }>();
  let y = sy, m = sm;
  while (y < ey || (y === ey && m <= em)) {
    const key = `${y}-${String(m).padStart(2, "0")}`;
    const label = new Date(y, m - 1).toLocaleDateString("id-ID", {
      month: "short",
      ...(multiYear ? { year: "2-digit" } : {}),
    });
    monthMap.set(key, { bulan: label, pemasukan: 0, pengeluaran: 0 });
    if (++m > 12) { m = 1; y++; }
  }

  for (const e of entries) {
    if (e.isCancelled) continue;
    const [ey2, em2] = e.tanggal.split("-");
    const rec = monthMap.get(`${ey2}-${em2}`);
    if (!rec) continue;
    if (e.jenis === "kredit") rec.pemasukan += e.jumlah;
    else rec.pengeluaran += e.jumlah;
  }
  return Array.from(monthMap.values());
}

function jutaFmt(v: number) {
  const juta = v / 1_000_000;
  return juta % 1 === 0 ? String(juta) : juta.toFixed(1);
}

function TrendLineChart({ entries, dateRange }: { entries: ArusKasEntry[]; dateRange?: DateRange }) {
  const lineData = React.useMemo(() => buildLineData(entries, dateRange), [entries, dateRange]);

  return (
    <div className="rounded-lg border p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">
        Kurva Arus Kas {CURRENT_YEAR}
      </p>
      <ChartContainer config={lineChartConfig} className="h-52 w-full">
        <LineChart data={lineData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
          <XAxis dataKey="bulan" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
          <YAxis tickFormatter={jutaFmt} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={40} />
          <ChartTooltip
            content={<ChartTooltipContent formatter={(value) => (typeof value === "number" ? formatRupiah(value) : String(value))} />}
          />
          <ChartLegend content={<ChartLegendContent />} />
          <Line type="monotone" dataKey="pemasukan" stroke="var(--color-pemasukan)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          <Line type="monotone" dataKey="pengeluaran" stroke="var(--color-pengeluaran)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
        </LineChart>
      </ChartContainer>
      <p className="mt-1 text-center text-[10px] text-muted-foreground">Nilai dalam juta rupiah (Rp juta)</p>
    </div>
  );
}

// ── Summary Cards ─────────────────────────────────────────────────────────

function deltaPct(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function SummaryCards({ entries, showDelta = true }: { entries: ArusKasEntry[]; showDelta?: boolean }) {
  const active = entries.filter((e) => !e.isCancelled);
  const totalKredit = active.filter((e) => e.jenis === "kredit").reduce((s, e) => s + e.jumlah, 0);
  const totalDebit = active.filter((e) => e.jenis === "debit").reduce((s, e) => s + e.jumlah, 0);
  const saldo = totalKredit - totalDebit;

  const thisKey = `${CURRENT_YEAR}-${String(CURRENT_MONTH).padStart(2, "0")}`;
  const prevDate = new Date(CURRENT_YEAR, CURRENT_MONTH - 2);
  const prevKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;
  const sumBy = (key: string, jenis: ArusKasJenis) =>
    active.filter((e) => e.jenis === jenis && e.tanggal.startsWith(key)).reduce((s, e) => s + e.jumlah, 0);

  const kreditNow = sumBy(thisKey, "kredit"), kreditPrev = sumBy(prevKey, "kredit");
  const debitNow = sumBy(thisKey, "debit"), debitPrev = sumBy(prevKey, "debit");
  const saldoDelta = deltaPct(kreditNow - debitNow, kreditPrev - debitPrev);
  const kreditDelta = deltaPct(kreditNow, kreditPrev);
  const debitDelta = deltaPct(debitNow, debitPrev);

  const cards = [
    { label: "Saldo", value: formatRupiah(saldo), delta: saldoDelta, good: saldoDelta >= 0 },
    { label: "Total Pemasukan", value: formatRupiah(totalKredit), delta: kreditDelta, good: kreditDelta >= 0 },
    { label: "Total Pengeluaran", value: formatRupiah(totalDebit), delta: debitDelta, good: debitDelta <= 0 },
  ];

  return (
    <div className="grid grid-cols-3 gap-4">
      {cards.map((c) => {
        const Icon = c.delta >= 0 ? TrendingUp : TrendingDown;
        return (
          <Card key={c.label}>
            <CardHeader>
              <CardDescription className="text-xs tracking-wide uppercase">{c.label}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-1">
              <p className="font-mono text-2xl font-semibold tabular-nums text-foreground">{c.value}</p>
              {showDelta && (
                <p className={cn("inline-flex items-center gap-1 text-xs font-medium", c.good ? "text-success" : "text-destructive")}>
                  <Icon className="size-3.5" />
                  {Math.abs(c.delta)}% vs bulan lalu
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────

export default function ArusKasPage() {
  const { data, isLoading, isError, refetch } = useArusKasList();

  const [filterOpen, setFilterOpen] = React.useState(false);
  const [pendingJenis, setPendingJenis] = React.useState<ArusKasJenis[]>([]);
  const [pendingKategori, setPendingKategori] = React.useState<string[]>([]);
  const [pendingSumber, setPendingSumber] = React.useState<ArusKasSumber[]>([]);
  const [pendingTanggal, setPendingTanggal] = React.useState<DateRange | undefined>();
  const [appliedJenis, setAppliedJenis] = React.useState<ArusKasJenis[]>([]);
  const [appliedKategori, setAppliedKategori] = React.useState<string[]>([]);
  const [appliedSumber, setAppliedSumber] = React.useState<ArusKasSumber[]>([]);
  const [appliedTanggal, setAppliedTanggal] = React.useState<DateRange | undefined>();

  const hasDateFilter = !!(appliedTanggal?.from || appliedTanggal?.to);
  const hasFilter = appliedJenis.length > 0 || appliedKategori.length > 0 || appliedSumber.length > 0 || hasDateFilter;
  const hasPending = pendingJenis.length > 0 || pendingKategori.length > 0 || pendingSumber.length > 0 || !!(pendingTanggal?.from || pendingTanggal?.to);
  const filterCount = (appliedJenis.length > 0 ? 1 : 0) + (appliedKategori.length > 0 ? 1 : 0) + (appliedSumber.length > 0 ? 1 : 0) + (hasDateFilter ? 1 : 0);

  const kategoriOptions = React.useMemo<MultiSelectOption[]>(() => {
    const seen = new Set<string>();
    const opts: MultiSelectOption[] = [];
    for (const e of data ?? []) {
      if (seen.has(e.kategori)) continue;
      seen.add(e.kategori);
      opts.push({ value: e.kategori, label: e.kategori, variant: getKategoriBadge(e.kategori).variant });
    }
    return opts;
  }, [data]);

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

  const allEntries = React.useMemo(() => {
    const sorted = [...(data ?? [])].sort((a, b) => b.tanggal.localeCompare(a.tanggal));
    let filtered = sorted;
    if (appliedJenis.length > 0) filtered = filtered.filter((e) => appliedJenis.includes(e.jenis));
    if (appliedKategori.length > 0) filtered = filtered.filter((e) => appliedKategori.includes(e.kategori));
    if (appliedSumber.length > 0) filtered = filtered.filter((e) => appliedSumber.includes(e.sumber));
    if (hasDateFilter) filtered = filtered.filter((e) => inRange(e.tanggal, appliedTanggal));
    return filtered;
  }, [data, appliedJenis, appliedKategori, appliedSumber, appliedTanggal, hasDateFilter]);

  const columns: ColumnDef<ArusKasEntry>[] = [
    { accessorKey: "tanggal", header: "Tanggal", cell: ({ row }) => tanggalID(row.original.tanggal) },
    {
      accessorKey: "keterangan", header: "Keterangan", meta: { className: "min-w-48" },
      cell: ({ row }) => (
        <span className={row.original.isCancelled ? "text-muted-foreground line-through" : ""}>
          {row.original.keterangan || "—"}
        </span>
      ),
    },
    {
      accessorKey: "kategori", header: "Kategori", meta: { className: "text-center" },
      cell: ({ row }) => { const b = getKategoriBadge(row.original.kategori); return <Badge variant={b.variant}>{b.label}</Badge>; },
    },
    {
      accessorKey: "sumber", header: "Sumber", meta: { className: "text-center" },
      cell: ({ row }) => { const s = SUMBER_LABEL[row.original.sumber]; return <Badge variant={s.variant}>{s.label}</Badge>; },
    },
    {
      id: "pemasukan", header: "Pemasukan", meta: { align: "right", mono: true },
      accessorFn: (row) => (row.jenis === "kredit" ? row.jumlah : 0),
      cell: ({ row }) =>
        row.original.jenis === "kredit"
          ? <span className={row.original.isCancelled ? "text-muted-foreground line-through" : "text-emerald-600 dark:text-emerald-400"}>{formatRupiah(row.original.jumlah)}</span>
          : <span className="text-muted-foreground">—</span>,
    },
    {
      id: "pengeluaran", header: "Pengeluaran", meta: { align: "right", mono: true },
      accessorFn: (row) => (row.jenis === "debit" ? row.jumlah : 0),
      cell: ({ row }) =>
        row.original.jenis === "debit"
          ? <span className={row.original.isCancelled ? "text-muted-foreground line-through" : "text-red-600 dark:text-red-400"}>{formatRupiah(row.original.jumlah)}</span>
          : <span className="text-muted-foreground">—</span>,
    },
    {
      id: "status", header: "", meta: { collapse: true },
      cell: ({ row }) => (row.original.isCancelled ? <Badge variant="secondary">Dibatalkan</Badge> : null),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ArrowRightLeft className="size-5 text-muted-foreground" />
        <h1 className="text-xl font-semibold tracking-tight">Arus Kas</h1>
      </div>

      {!isLoading && !isError && <TrendLineChart entries={allEntries} dateRange={appliedTanggal} />}
      {!isLoading && !isError && <SummaryCards entries={allEntries} showDelta={!hasDateFilter} />}
      {!isLoading && !isError && <Separator />}

      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <div className="[&_td]:text-xs [&_td]:py-2">
          <DataTable
            columns={columns}
            data={allEntries}
            loading={isLoading}
            searchColumns={["keterangan"]}
            searchPlaceholder="Cari keterangan…"
            emptyMessage="Belum ada transaksi"
            defaultSorting={[{ id: "tanggal", desc: true }]}
            rowActions={false}
            toolbarActions={
              <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={openFilter}>
                <SlidersHorizontal className="size-3.5" />
                Filter
                {hasFilter && <Badge variant="secondary" className="px-1.5 py-0 text-xs">{filterCount}</Badge>}
              </Button>
            }
          />
        </div>
      )}

      <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader><DialogTitle>Filter Arus Kas</DialogTitle></DialogHeader>
          <div className="space-y-5 py-1">
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Jenis</p>
              <MultiSelectFilter options={JENIS_OPTIONS} value={pendingJenis} onChange={(v) => setPendingJenis(v as ArusKasJenis[])} placeholder="Pilih jenis…" searchPlaceholder="Cari jenis…" noun="jenis" />
            </div>
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Kategori</p>
              <MultiSelectFilter options={kategoriOptions} value={pendingKategori} onChange={setPendingKategori} placeholder="Pilih kategori…" searchPlaceholder="Cari kategori…" noun="kategori" />
            </div>
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Sumber</p>
              <MultiSelectFilter options={SUMBER_OPTIONS} value={pendingSumber} onChange={(v) => setPendingSumber(v as ArusKasSumber[])} placeholder="Pilih sumber…" searchPlaceholder="Cari sumber…" noun="sumber" />
            </div>
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Tanggal</p>
              <DateRangeInput value={pendingTanggal} onChange={setPendingTanggal} />
            </div>
          </div>
          <DialogFooter className="flex-row items-center gap-2">
            <Button variant={hasPending ? "ghost" : "outline"} size="sm" className="mr-auto" onClick={resetFilter}>
              {hasPending ? "Reset" : "Tutup"}
            </Button>
            <Button size="sm" onClick={applyFilter}>Terapkan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
