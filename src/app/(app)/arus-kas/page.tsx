"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import type { ColumnDef } from "@tanstack/react-table";
import type { DateRange } from "react-day-picker";
import { id as idLocale } from "date-fns/locale";
import {
  ArrowRightLeft, CalendarIcon, Check, ChevronDown, MoreHorizontal, Plus, SlidersHorizontal, Trash2,
  TrendingUp, TrendingDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DataTable } from "@/components/shared/data-table";
import { ErrorState } from "@/components/shared/error-state";
import { FormSheet } from "@/components/shared/form-sheet";
import { MoneyInput } from "@/components/shared/money-input";
import { MultiSelectFilter, type MultiSelectOption } from "@/components/shared/multi-select-filter";
import { ComboboxCreate } from "@/components/shared/combobox-create";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import {
  ChartContainer, ChartTooltip, ChartTooltipContent,
  ChartLegend, ChartLegendContent, type ChartConfig,
} from "@/components/ui/chart";
import { formatRupiah } from "@/lib/format";
import { useArusKasList, useCreateArusKas, useRemoveArusKas } from "@/lib/query/arus-kas";
import { useProyekList } from "@/lib/query/proyek";
import { onFormInvalid } from "@/lib/form-toast";
import type { Proyek } from "@/lib/schemas/proyek";
import {
  arusKasFormSchema,
  type ArusKasEntry, type ArusKasFormValues, type ArusKasJenis, type ArusKasKategori, type ArusKasSumber,
} from "@/lib/schemas/arus-kas";

// ── Helpers ──────────────────────────────────────────────────────────────

function tanggalID(iso: string) {
  return iso
    ? new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
    : "—";
}

const FIXED_KATEGORI: Record<string, { label: string; variant: "success" | "info" | "warning" | "secondary" | "outline" }> = {
  faktur:     { label: "Faktur",     variant: "success" },
  penggajian: { label: "Penggajian", variant: "info" },
  pajak:      { label: "Pajak",      variant: "warning" },
  bonus:      { label: "Bonus",      variant: "secondary" },
};

function getKategoriBadge(k: string) {
  return FIXED_KATEGORI[k] ?? { label: k, variant: "outline" as const };
}

const SUMBER_LABEL: Record<ArusKasSumber, { label: string; variant: "secondary" | "info" }> = {
  manual:              { label: "Manual",   variant: "secondary" },
  otomatis_faktur:     { label: "Otomatis", variant: "info" },
  otomatis_penggajian: { label: "Otomatis", variant: "info" },
  otomatis_pajak:      { label: "Otomatis", variant: "info" },
};

const JENIS_OPTIONS: { value: ArusKasJenis; label: string }[] = [
  { value: "kredit", label: "Pemasukan (Kredit)" },
  { value: "debit", label: "Pengeluaran (Debit)" },
];

const FIXED_KATEGORI_OPTIONS: { value: ArusKasKategori; label: string }[] = [
  { value: "faktur", label: "Faktur" },
  { value: "penggajian", label: "Penggajian" },
  { value: "pajak", label: "Pajak" },
  { value: "bonus", label: "Bonus" },
];

const SUMBER_OPTIONS: { value: "manual" | "otomatis"; label: string }[] = [
  { value: "manual", label: "Manual" },
  { value: "otomatis", label: "Otomatis" },
];

const JENIS_OPTS = [
  { value: "kredit", label: "Pemasukan (Kredit)" },
  { value: "debit", label: "Pengeluaran (Debit)" },
] as const;

function isSumberMatch(sumber: ArusKasSumber, filter: "manual" | "otomatis"): boolean {
  return filter === "manual" ? sumber === "manual" : sumber.startsWith("otomatis");
}

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

// ── Proyek searchable popover ─────────────────────────────────────────────

function ProyekSearchPopover({
  value,
  onChange,
  proyekList,
}: {
  value: string | undefined;
  onChange: (id: string | undefined) => void;
  proyekList: Proyek[];
}) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const matchCount = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? proyekList.filter((p) => p.nama.toLowerCase().includes(q)).length : proyekList.length;
  }, [proyekList, search]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = q ? proyekList.filter((p) => p.nama.toLowerCase().includes(q)) : proyekList;
    return base.slice(0, 5);
  }, [proyekList, search]);

  const hiddenCount = Math.max(0, matchCount - 5);
  const selected = proyekList.find((p) => p.id === value);

  const pick = (id: string | undefined) => {
    onChange(id);
    setOpen(false);
    setSearch("");
  };

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setSearch(""); }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <span className={selected ? "" : "text-muted-foreground"}>
            {selected ? selected.nama : "— Tidak ditautkan —"}
          </span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-2" style={{ width: "var(--radix-popover-trigger-width)" }} align="start">
        <Input
          placeholder="Cari proyek…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 text-sm mb-1.5"
          autoFocus
        />
        <div className="space-y-0.5">
          <button
            type="button"
            className="flex w-full items-center justify-between rounded px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent"
            onClick={() => pick(undefined)}
          >
            — Tidak ditautkan —
            {!value && <Check className="size-3.5 text-primary" />}
          </button>
          {filtered.map((p) => (
            <button
              key={p.id}
              type="button"
              className="flex w-full items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-accent"
              onClick={() => pick(p.id)}
            >
              <span className="truncate">{p.nama}</span>
              {value === p.id && <Check className="size-3.5 shrink-0 text-primary ml-2" />}
            </button>
          ))}
          {hiddenCount > 0 && (
            <p className="px-2 py-1 text-xs text-muted-foreground">
              dan {hiddenCount} proyek lainnya — ketik untuk mencari
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
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
  // Determine month span from date range filter or default to Jan–current month.
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
    const [ey2, em2] = e.tanggal.split("-");
    const rec = monthMap.get(`${ey2}-${em2}`);
    if (!rec) continue;
    if (e.jenis === "kredit") rec.pemasukan += e.jumlah;
    else rec.pengeluaran += e.jumlah;
  }
  return Array.from(monthMap.values());
}

// ── Line Chart ────────────────────────────────────────────────────────────

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
          <XAxis
            dataKey="bulan"
            tick={{ fontSize: 10 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tickFormatter={jutaFmt}
            tick={{ fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            width={40}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value) =>
                  typeof value === "number" ? formatRupiah(value) : String(value)
                }
              />
            }
          />
          <ChartLegend content={<ChartLegendContent />} />
          <Line
            type="monotone"
            dataKey="pemasukan"
            stroke="var(--color-pemasukan)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="pengeluaran"
            stroke="var(--color-pengeluaran)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ChartContainer>
      <p className="mt-1 text-center text-[10px] text-muted-foreground">
        Nilai dalam juta rupiah (Rp juta)
      </p>
    </div>
  );
}

// ── Summary Cards ─────────────────────────────────────────────────────────

/** Month-over-month percentage change (rounded). Handles a zero baseline. */
function deltaPct(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function SummaryCards({ entries, showDelta = true }: { entries: ArusKasEntry[]; showDelta?: boolean }) {
  const totalKredit = entries.filter((e) => e.jenis === "kredit").reduce((s, e) => s + e.jumlah, 0);
  const totalDebit = entries.filter((e) => e.jenis === "debit").reduce((s, e) => s + e.jumlah, 0);
  const saldo = totalKredit - totalDebit;

  // Current month vs previous month for the "vs bulan lalu" delta.
  const thisKey = `${CURRENT_YEAR}-${String(CURRENT_MONTH).padStart(2, "0")}`;
  const prevDate = new Date(CURRENT_YEAR, CURRENT_MONTH - 2); // CURRENT_MONTH is 1-based
  const prevKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;
  const sumBy = (key: string, jenis: ArusKasJenis) =>
    entries.filter((e) => e.jenis === jenis && e.tanggal.startsWith(key)).reduce((s, e) => s + e.jumlah, 0);

  const kreditNow = sumBy(thisKey, "kredit"), kreditPrev = sumBy(prevKey, "kredit");
  const debitNow = sumBy(thisKey, "debit"), debitPrev = sumBy(prevKey, "debit");
  const saldoDelta = deltaPct(kreditNow - debitNow, kreditPrev - debitPrev);
  const kreditDelta = deltaPct(kreditNow, kreditPrev);
  const debitDelta = deltaPct(debitNow, debitPrev);

  const cards = [
    { label: "Saldo", value: formatRupiah(saldo), delta: saldoDelta, good: saldoDelta >= 0 },
    { label: "Total Pemasukan", value: formatRupiah(totalKredit), delta: kreditDelta, good: kreditDelta >= 0 },
    // For pengeluaran a decrease is favorable.
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
                <p
                  className={cn(
                    "inline-flex items-center gap-1 text-xs font-medium",
                    c.good ? "text-success" : "text-destructive",
                  )}
                >
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

// ── Create Sheet ──────────────────────────────────────────────────────────

function ArusKasCreateSheet({
  open,
  onOpenChange,
  moneyKey,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  moneyKey: number;
}) {
  const createMutation = useCreateArusKas();
  const { data: proyekList = [] } = useProyekList();
  const { data: arusKasData = [] } = useArusKasList();

  // Existing categories (fixed + any custom already used) for the combobox.
  const kategoriOptions = React.useMemo<MultiSelectOption[]>(() => {
    const seen = new Set<string>();
    const opts: MultiSelectOption[] = [];
    const push = (value: string, label: string) => {
      if (seen.has(value)) return;
      seen.add(value);
      opts.push({ value, label, variant: getKategoriBadge(value).variant });
    };
    FIXED_KATEGORI_OPTIONS.forEach((o) => push(o.value, o.label));
    arusKasData.forEach((e) => push(e.kategori, e.kategori));
    return opts;
  }, [arusKasData]);

  const form = useForm<ArusKasFormValues>({
    resolver: zodResolver(arusKasFormSchema),
    defaultValues: {
      jenis: "debit",
      tanggal: format(new Date(), "yyyy-MM-dd"),
      jumlah: 0,
      kategori: "",
      keterangan: "",
      proyekId: undefined,
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    await createMutation.mutateAsync(values);
    onOpenChange(false);
  }, onFormInvalid);

  return (
    <FormSheet
      open={open}
      onOpenChange={(o) => { onOpenChange(o); if (!o) form.reset(); }}
      title="Tambah Transaksi"
      description="Catat pemasukan atau pengeluaran kas secara manual."
      onSubmit={onSubmit}
      submitLabel={createMutation.isPending ? "Menyimpan…" : "Simpan"}
    >
      {/* Jenis */}
      <Field>
        <FieldLabel>Jenis</FieldLabel>
        <div className="grid grid-cols-2 gap-2">
          {JENIS_OPTS.map((o) => (
            <Button
              key={o.value}
              type="button"
              variant={form.watch("jenis") === o.value ? "default" : "outline"}
              className="w-full"
              onClick={() => form.setValue("jenis", o.value, { shouldValidate: true })}
            >
              {o.label}
            </Button>
          ))}
        </div>
        <FieldError>{form.formState.errors.jenis?.message}</FieldError>
      </Field>

      {/* Keterangan */}
      <Field>
        <FieldLabel>Keterangan</FieldLabel>
        <Input
          {...form.register("keterangan")}
          placeholder="Deskripsi transaksi"
        />
        <FieldError>{form.formState.errors.keterangan?.message}</FieldError>
      </Field>

      {/* Tanggal */}
      <Field>
        <FieldLabel>Tanggal</FieldLabel>
        <DatePicker
          value={form.watch("tanggal") ? new Date(form.watch("tanggal") + "T00:00:00") : undefined}
          onChange={(d) => form.setValue("tanggal", d ? format(d, "yyyy-MM-dd") : "", { shouldValidate: true })}
        />
        <FieldError>{form.formState.errors.tanggal?.message}</FieldError>
      </Field>

      {/* Jumlah */}
      <Field>
        <FieldLabel>Jumlah</FieldLabel>
        <MoneyInput
          key={moneyKey}
          defaultValue={0}
          onValueChange={(v) => form.setValue("jumlah", v, { shouldValidate: true })}
        />
        <FieldError>{form.formState.errors.jumlah?.message}</FieldError>
      </Field>

      {/* Kategori — searchable single-select, can create new on the spot */}
      <Field>
        <FieldLabel>Kategori</FieldLabel>
        <ComboboxCreate
          options={kategoriOptions}
          value={form.watch("kategori")}
          onChange={(v) => form.setValue("kategori", v, { shouldValidate: true })}
          placeholder="Pilih kategori…"
          searchPlaceholder="Cari atau ketik kategori baru…"
          createLabel={(q) => `Tambah kategori "${q}"`}
        />
        <FieldError>{form.formState.errors.kategori?.message}</FieldError>
      </Field>

      {/* Proyek — searchable */}
      <Field>
        <FieldLabel>Proyek <span className="text-muted-foreground font-normal">(opsional)</span></FieldLabel>
        <ProyekSearchPopover
          value={form.watch("proyekId")}
          onChange={(id) => form.setValue("proyekId", id)}
          proyekList={proyekList}
        />
      </Field>
    </FormSheet>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────

export default function ArusKasPage() {
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useArusKasList();
  const removeMutation = useRemoveArusKas();

  const [createOpen, setCreateOpen] = React.useState(false);
  const [createKey, setCreateKey] = React.useState(0);

  // Filter state
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [pendingJenis, setPendingJenis] = React.useState<ArusKasJenis[]>([]);
  const [pendingKategori, setPendingKategori] = React.useState<string[]>([]);
  const [pendingSumber, setPendingSumber] = React.useState<("manual" | "otomatis")[]>([]);
  const [pendingTanggal, setPendingTanggal] = React.useState<DateRange | undefined>();
  const [appliedJenis, setAppliedJenis] = React.useState<ArusKasJenis[]>([]);
  const [appliedKategori, setAppliedKategori] = React.useState<string[]>([]);
  const [appliedSumber, setAppliedSumber] = React.useState<("manual" | "otomatis")[]>([]);
  const [appliedTanggal, setAppliedTanggal] = React.useState<DateRange | undefined>();

  const hasDateFilter = !!(appliedTanggal?.from || appliedTanggal?.to);
  const hasFilter = appliedJenis.length > 0 || appliedKategori.length > 0 || appliedSumber.length > 0 || hasDateFilter;
  const hasPending = pendingJenis.length > 0 || pendingKategori.length > 0 || pendingSumber.length > 0 || !!(pendingTanggal?.from || pendingTanggal?.to);
  const filterCount = (appliedJenis.length > 0 ? 1 : 0) + (appliedKategori.length > 0 ? 1 : 0) + (appliedSumber.length > 0 ? 1 : 0) + (hasDateFilter ? 1 : 0);

  // Derive unique custom categories from data for filter dialog
  const customKategoriOptions = React.useMemo(() => {
    const fixed = new Set(["faktur", "penggajian", "pajak", "bonus"]);
    const custom = new Set<string>();
    (data ?? []).forEach((e) => { if (!fixed.has(e.kategori)) custom.add(e.kategori); });
    return Array.from(custom).sort();
  }, [data]);

  const allKategoriOptions = React.useMemo<MultiSelectOption[]>(() => [
    ...FIXED_KATEGORI_OPTIONS.map((o) => ({ value: o.value, label: o.label, variant: getKategoriBadge(o.value).variant })),
    ...customKategoriOptions.map((k) => ({ value: k, label: k, variant: getKategoriBadge(k).variant })),
  ], [customKategoriOptions]);

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
        if (refPath) {
          return (
            <button
              type="button"
              onClick={() => router.push(refPath)}
              className="text-left text-[var(--link)] hover:underline"
            >
              {e.keterangan}
            </button>
          );
        }
        return <span>{e.keterangan}</span>;
      },
    },
    {
      accessorKey: "kategori", header: "Kategori", meta: { className: "text-center" },
      cell: ({ row }) => {
        const b = getKategoriBadge(row.original.kategori);
        return <Badge variant={b.variant}>{b.label}</Badge>;
      },
    },
    {
      accessorKey: "sumber", header: "Sumber", meta: { className: "text-center" },
      cell: ({ row }) => {
        const s = SUMBER_LABEL[row.original.sumber];
        return <Badge variant={s.variant}>{s.label}</Badge>;
      },
    },
    {
      id: "pemasukan", header: "Pemasukan",
      meta: { align: "right", mono: true },
      accessorFn: (row) => (row.jenis === "kredit" ? row.jumlah : 0),
      cell: ({ row }) =>
        row.original.jenis === "kredit"
          ? <span className="text-emerald-600 dark:text-emerald-400">{formatRupiah(row.original.jumlah)}</span>
          : <span className="text-muted-foreground">—</span>,
    },
    {
      id: "pengeluaran", header: "Pengeluaran",
      meta: { align: "right", mono: true },
      accessorFn: (row) => (row.jenis === "debit" ? row.jumlah : 0),
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
        <Button onClick={() => { setCreateOpen(true); setCreateKey((k) => k + 1); }}>
          <Plus className="size-4 mr-1.5" /> Tambah Transaksi
        </Button>
      </div>

      {!isLoading && !isError && (
        <TrendLineChart entries={allEntries} dateRange={appliedTanggal} />
      )}

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
              {hasFilter && (
                <Badge variant="secondary" className="px-1.5 py-0 text-xs">{filterCount}</Badge>
              )}
            </Button>
          }
        />
        </div>
      )}

      <ArusKasCreateSheet open={createOpen} onOpenChange={setCreateOpen} moneyKey={createKey} />

      {/* Filter Dialog */}
      <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader><DialogTitle>Filter Arus Kas</DialogTitle></DialogHeader>
          <div className="space-y-5 py-1">
            {/* Jenis */}
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Jenis</p>
              <MultiSelectFilter
                options={JENIS_OPTIONS}
                value={pendingJenis}
                onChange={(v) => setPendingJenis(v as ArusKasJenis[])}
                placeholder="Pilih jenis…"
                searchPlaceholder="Cari jenis…"
                noun="jenis"
              />
            </div>
            {/* Kategori */}
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Kategori</p>
              <MultiSelectFilter
                options={allKategoriOptions}
                value={pendingKategori}
                onChange={setPendingKategori}
                placeholder="Pilih kategori…"
                searchPlaceholder="Cari kategori…"
                noun="kategori"
              />
            </div>
            {/* Sumber */}
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Sumber</p>
              <MultiSelectFilter
                options={SUMBER_OPTIONS}
                value={pendingSumber}
                onChange={(v) => setPendingSumber(v as ("manual" | "otomatis")[])}
                placeholder="Pilih sumber…"
                searchPlaceholder="Cari sumber…"
                noun="sumber"
              />
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
