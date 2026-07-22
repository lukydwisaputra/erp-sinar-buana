"use client";
import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { ColumnDef } from "@tanstack/react-table";
import { AlertTriangle, Check, ChevronDown, ChevronUp, FileX, Landmark, SlidersHorizontal, Undo2 } from "lucide-react";
import { DataTable } from "@/components/shared/data-table";
import { ErrorState } from "@/components/shared/error-state";
import { MoneyInput } from "@/components/shared/money-input";
import { MultiSelectFilter, type MultiSelectOption } from "@/components/shared/multi-select-filter";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldLabel, FieldError, FieldDescription } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { formatRupiah, formatRupiahCompact } from "@/lib/format";
import { onFormInvalid } from "@/lib/form-toast";
import {
  useTaxEntryList, useSettleTaxEntry, useUnsettleTaxEntry, useUpdateBuktiPotong,
} from "@/lib/query/tax-entries";
import { usePajakConfig, useUpdatePajakConfig } from "@/lib/query/pajak-config";
import {
  taxType, settleTaxEntrySchema, type TaxType, type TaxEntry, type TaxSettlementStatus,
} from "@/lib/schemas/tax-entries";
import type { PajakConfig } from "@/lib/schemas/pajak-config";

// ── Helpers ──────────────────────────────────────────────────────────────

function tanggalID(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "—";
}

function daysUntil(iso: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((new Date(iso).getTime() - now.getTime()) / 86_400_000);
}

const JENIS_META: Record<TaxType, { label: string; variant: "info" | "secondary" | "warning" | "destructive" }> = {
  ppn_keluaran: { label: "PPN Keluaran", variant: "info" },
  ppn_masukan: { label: "PPN Masukan", variant: "secondary" },
  pph23_dipotong: { label: "PPh Dipotong", variant: "warning" },
  pph21: { label: "PPh 21", variant: "secondary" },
  bpjs_kesehatan: { label: "BPJS Kesehatan", variant: "secondary" },
  bpjs_ketenagakerjaan: { label: "BPJS Ketenagakerjaan", variant: "secondary" },
};

const JENIS_OPTIONS: MultiSelectOption[] = taxType.options.map((v) => ({ value: v, label: JENIS_META[v].label, variant: JENIS_META[v].variant }));

const STATUS_META: Record<TaxSettlementStatus, { label: string; variant: "warning" | "success" | "destructive" }> = {
  belum_disetor: { label: "Belum Disetor", variant: "warning" },
  terlambat: { label: "Terlambat", variant: "destructive" },
  sudah_disetor: { label: "Sudah Disetor", variant: "success" },
};

const STATUS_OPTIONS: MultiSelectOption[] = Object.entries(STATUS_META).map(([value, m]) => ({ value, label: m.label, variant: m.variant }));

function JenisBadge({ jenis }: { jenis: TaxType }) {
  const m = JENIS_META[jenis];
  return <Badge variant={m.variant}>{m.label}</Badge>;
}

function JatuhTempoBadge({ iso, status }: { iso: string | null; status: TaxSettlementStatus }) {
  if (!iso) return <span className="text-muted-foreground">—</span>;
  const days = daysUntil(iso);
  const label = tanggalID(iso);
  if (status === "sudah_disetor") return <span className="font-mono">{label}</span>;
  if (days < 0) return <span className="font-mono font-medium text-destructive">{label}</span>;
  if (days <= 7) return <span className="font-mono font-medium text-amber-600 dark:text-amber-400">{label}</span>;
  return <span className="font-mono">{label}</span>;
}

// ── Settle dialog ────────────────────────────────────────────────────────

const settleFormSchema = settleTaxEntrySchema.extend({
  buktiPotongReceived: z.boolean().optional(),
});
type SettleForm = z.input<typeof settleFormSchema>;

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function SettleDialog({ entry, onOpenChange }: { entry: TaxEntry | null; onOpenChange: (open: boolean) => void }) {
  const { mutateAsync, isPending } = useSettleTaxEntry();
  const isPph23 = entry?.taxType === "pph23_dipotong";

  const form = useForm<SettleForm>({
    resolver: zodResolver(settleFormSchema),
    defaultValues: { settledDate: todayISO(), ntpn: "", buktiPotongReceived: false },
  });
  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = form;

  React.useEffect(() => {
    if (entry) reset({ settledDate: todayISO(), ntpn: entry.ntpn ?? "", buktiPotongReceived: entry.buktiPotongReceived });
  }, [entry, reset]);

  const onSubmit = handleSubmit(async (values) => {
    if (!entry) return;
    await mutateAsync({
      id: entry.id,
      input: {
        settledDate: values.settledDate,
        ntpn: values.ntpn || undefined,
        buktiPotongReceived: isPph23 ? values.buktiPotongReceived : undefined,
      },
    });
    onOpenChange(false);
  }, onFormInvalid);

  return (
    <Dialog open={!!entry} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Tandai Selesai</DialogTitle></DialogHeader>
        {entry && (
          <form onSubmit={onSubmit} className="space-y-4">
            <Field data-invalid={!!errors.settledDate}>
              <FieldLabel>Tanggal Setor</FieldLabel>
              <Input type="date" {...register("settledDate")} />
              {errors.settledDate && <FieldError>{errors.settledDate.message}</FieldError>}
            </Field>
            <Field>
              <FieldLabel>Keterangan (opsional)</FieldLabel>
              <Input placeholder="Catatan tambahan…" {...register("ntpn")} />
            </Field>
            {isPph23 && (
              <Field orientation="horizontal" className="items-center">
                <Checkbox
                  id="settle-bukti-potong"
                  checked={watch("buktiPotongReceived")}
                  onCheckedChange={(v) => setValue("buktiPotongReceived", !!v)}
                />
                <FieldLabel htmlFor="settle-bukti-potong" className="font-normal">Bukti potong sudah diterima</FieldLabel>
              </Field>
            )}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Batal</Button>
              <Button type="submit" disabled={isPending}>{isPending ? "Menyimpan…" : "Tandai Selesai"}</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Table columns ─────────────────────────────────────────────────────────

function BuktiPotongCell({ entry }: { entry: TaxEntry }) {
  const { mutate, isPending } = useUpdateBuktiPotong();
  if (entry.taxType !== "pph23_dipotong") return <span className="text-muted-foreground">—</span>;
  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => mutate({ id: entry.id, received: !entry.buktiPotongReceived })}
      className="disabled:opacity-50"
    >
      {entry.buktiPotongReceived ? <Badge variant="success">Diterima</Badge> : <Badge variant="destructive">Belum</Badge>}
    </button>
  );
}

function AksiCell({ entry, onSettle, onUnsettle }: { entry: TaxEntry; onSettle: () => void; onUnsettle: () => void }) {
  if (entry.settlementStatus === "sudah_disetor") {
    return (
      <Button variant="ghost" size="sm" onClick={onUnsettle}>
        <Undo2 className="size-3.5" /> Batalkan
      </Button>
    );
  }
  return (
    <Button variant="outline" size="sm" onClick={onSettle}>
      <Check className="size-3.5" /> Tandai Selesai
    </Button>
  );
}

function buildColumns(
  onSettle: (entry: TaxEntry) => void,
  onUnsettle: (entry: TaxEntry) => void,
): ColumnDef<TaxEntry>[] {
  return [
    { accessorKey: "id", header: "ID", meta: { mono: true }, cell: ({ row }) => <span className="font-mono">{row.original.id.slice(0, 8)}</span> },
    { accessorKey: "taxType", header: "Jenis", cell: ({ row }) => <JenisBadge jenis={row.original.taxType} /> },
    { accessorKey: "taxPeriod", header: "Periode", meta: { mono: true }, cell: ({ row }) => <span className="font-mono">{row.original.taxPeriod.slice(0, 7)}</span> },
    {
      accessorKey: "jumlah", header: "Jumlah", meta: { mono: true, className: "text-right" },
      cell: ({ row }) => <span className="font-mono" title={formatRupiah(row.original.jumlah)}>{formatRupiahCompact(row.original.jumlah)}</span>,
    },
    { accessorKey: "dueDate", header: "Jatuh Tempo", cell: ({ row }) => <JatuhTempoBadge iso={row.original.dueDate} status={row.original.settlementStatus} /> },
    {
      accessorKey: "buktiPotongReceived", header: "Bukti Potong",
      cell: ({ row }) => <BuktiPotongCell entry={row.original} />,
    },
    { accessorKey: "notes", header: "Keterangan", meta: { className: "min-w-48 text-muted-foreground" }, cell: ({ row }) => row.original.notes || <span className="text-muted-foreground">—</span> },
    {
      accessorKey: "settlementStatus", header: "Status",
      cell: ({ row }) => { const m = STATUS_META[row.original.settlementStatus]; return <Badge variant={m.variant}>{m.label}</Badge>; },
    },
    {
      id: "aksi", header: "", enableSorting: false,
      cell: ({ row }) => <AksiCell entry={row.original} onSettle={() => onSettle(row.original)} onUnsettle={() => onUnsettle(row.original)} />,
    },
  ];
}

// ── KPI strip ─────────────────────────────────────────────────────────────

interface KpiCardProps { label: string; value: string; sub?: string; icon: React.ElementType; danger?: boolean; warn?: boolean; }

function KpiCard({ label, value, sub, icon: Icon, danger, warn }: KpiCardProps) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className={`font-mono text-2xl font-semibold tabular-nums leading-tight ${danger ? "text-destructive" : warn ? "text-amber-600 dark:text-amber-400" : ""}`}>{value}</p>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
        <Icon className={`mt-0.5 size-5 shrink-0 ${danger ? "text-destructive" : warn ? "text-amber-500" : "text-muted-foreground"}`} />
      </CardContent>
    </Card>
  );
}

// ── Config card (still mock — out of scope this pass) ─────────────────────

const configFormSchema = z.object({
  metode: z.enum(["final_05", "badan_22"]),
  tarifFinalPersen: z.coerce.number().min(0).max(100),
  tarifBadanPersen: z.coerce.number().min(0).max(100),
  ambangOmzet: z.coerce.number().min(0),
});
type ConfigForm = z.input<typeof configFormSchema>;

function KonfigurasiCard({ config }: { config: PajakConfig }) {
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const { mutateAsync, isPending } = useUpdatePajakConfig();

  const form = useForm<ConfigForm>({
    resolver: zodResolver(configFormSchema),
    defaultValues: {
      metode: config.metode,
      tarifFinalPersen: config.tarifFinalPersen,
      tarifBadanPersen: config.tarifBadanPersen,
      ambangOmzet: config.ambangOmzet,
    },
  });
  const { register, handleSubmit, watch, reset, formState: { errors } } = form;
  const metode = watch("metode");

  React.useEffect(() => {
    reset({
      metode: config.metode,
      tarifFinalPersen: config.tarifFinalPersen,
      tarifBadanPersen: config.tarifBadanPersen,
      ambangOmzet: config.ambangOmzet,
    });
  }, [config, reset]);

  const onSubmit = handleSubmit(async (values) => {
    await mutateAsync({
      metode: values.metode,
      tarifFinalPersen: Number(values.tarifFinalPersen),
      tarifBadanPersen: Number(values.tarifBadanPersen),
      ambangOmzet: Number(values.ambangOmzet),
    });
    setEditing(false);
  }, onFormInvalid);

  const metodeLabel = config.metode === "final_05" ? "PPh Final (PP 55/2022)" : "PPh Badan Normal";
  const tarifLabel = config.metode === "final_05" ? `${config.tarifFinalPersen}% dari omzet` : `${config.tarifBadanPersen}% dari laba kena pajak`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Konfigurasi PPh Badan</CardTitle>
        <CardAction className="flex items-center gap-1">
          {!editing && (
            <Button variant="ghost" size="sm" onClick={() => { setEditing(true); setOpen(true); }}>Ubah</Button>
          )}
          <Button variant="ghost" size="icon" className="size-7" onClick={() => setOpen((o) => !o)}>
            {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </Button>
        </CardAction>
      </CardHeader>

      {open && (
        <CardContent className="pt-0">
          {!editing ? (
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
              <div><p className="text-xs text-muted-foreground">Metode</p><p className="font-medium">{metodeLabel}</p></div>
              <div><p className="text-xs text-muted-foreground">Tarif</p><p className="font-mono font-medium">{tarifLabel}</p></div>
              <div><p className="text-xs text-muted-foreground">Ambang Omzet</p><p className="font-mono font-medium" title={formatRupiah(config.ambangOmzet)}>{formatRupiahCompact(config.ambangOmzet)}</p></div>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <Field>
                <FieldLabel>Metode PPh Badan</FieldLabel>
                <Select value={metode} onValueChange={(v) => form.setValue("metode", v as "final_05" | "badan_22")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="final_05">PPh Final 0.5% (PP 55/2022) — omzet ≤ Rp 4.8 M</SelectItem>
                    <SelectItem value="badan_22">PPh Badan Normal 22% — omzet &gt; Rp 4.8 M</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              {metode === "final_05" ? (
                <Field>
                  <FieldLabel>Tarif Final (%)</FieldLabel>
                  <InputGroup>
                    <InputGroupInput type="number" step="0.01" {...register("tarifFinalPersen")} />
                    <InputGroupAddon align="inline-end"><InputGroupText>%</InputGroupText></InputGroupAddon>
                  </InputGroup>
                  {errors.tarifFinalPersen && <FieldError>{errors.tarifFinalPersen.message}</FieldError>}
                </Field>
              ) : (
                <Field>
                  <FieldLabel>Tarif Badan (%)</FieldLabel>
                  <InputGroup>
                    <InputGroupInput type="number" step="0.1" {...register("tarifBadanPersen")} />
                    <InputGroupAddon align="inline-end"><InputGroupText>%</InputGroupText></InputGroupAddon>
                  </InputGroup>
                  {errors.tarifBadanPersen && <FieldError>{errors.tarifBadanPersen.message}</FieldError>}
                </Field>
              )}

              <Field>
                <FieldLabel>Ambang Omzet (Rp)</FieldLabel>
                <MoneyInput key={config.ambangOmzet} defaultValue={config.ambangOmzet} onValueChange={(v) => form.setValue("ambangOmzet", v)} className="w-full" />
                <FieldDescription>Batas omzet tahunan untuk penentuan metode pajak.</FieldDescription>
                {errors.ambangOmzet && <FieldError>{errors.ambangOmzet.message}</FieldError>}
              </Field>

              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={isPending}>{isPending ? "Menyimpan…" : "Simpan"}</Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => { setEditing(false); reset(); }}>Batal</Button>
              </div>
            </form>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function Page() {
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [pendingJenis, setPendingJenis] = React.useState<TaxType[]>([]);
  const [pendingStatus, setPendingStatus] = React.useState<TaxSettlementStatus[]>([]);
  const [appliedJenis, setAppliedJenis] = React.useState<TaxType[]>([]);
  const [appliedStatus, setAppliedStatus] = React.useState<TaxSettlementStatus[]>([]);
  const [settlingEntry, setSettlingEntry] = React.useState<TaxEntry | null>(null);
  const [unsettlingEntry, setUnsettlingEntry] = React.useState<TaxEntry | null>(null);

  const { data, isLoading, isError, refetch } = useTaxEntryList();
  const { data: config, isLoading: configLoading } = usePajakConfig();
  const { mutateAsync: unsettle, isPending: unsettling } = useUnsettleTaxEntry();

  const columns = React.useMemo(
    () => buildColumns(setSettlingEntry, setUnsettlingEntry),
    [],
  );

  const hasFilter = appliedJenis.length > 0 || appliedStatus.length > 0;
  const hasPending = pendingJenis.length > 0 || pendingStatus.length > 0;
  const filterCount = appliedJenis.length + appliedStatus.length;

  function openFilter() { setPendingJenis(appliedJenis); setPendingStatus(appliedStatus); setFilterOpen(true); }
  function applyFilter() { setAppliedJenis(pendingJenis); setAppliedStatus(pendingStatus); setFilterOpen(false); }
  function resetFilter() {
    if (hasPending) { setPendingJenis([]); setPendingStatus([]); } else { setFilterOpen(false); }
  }

  const filteredData = React.useMemo(() => {
    let base = data ?? [];
    if (appliedJenis.length > 0) base = base.filter((k) => appliedJenis.includes(k.taxType));
    if (appliedStatus.length > 0) base = base.filter((k) => appliedStatus.includes(k.settlementStatus));
    return base;
  }, [data, appliedJenis, appliedStatus]);

  const kpi = React.useMemo(() => {
    const all = data ?? [];
    const belum = all.filter((k) => k.settlementStatus !== "sudah_disetor");
    const totalBelumSetor = belum.reduce((s, k) => s + k.jumlah, 0);
    const terlambat = belum.filter((k) => k.dueDate && daysUntil(k.dueDate) < 0).length;
    const jatuhTempo7 = belum.filter((k) => { if (!k.dueDate) return false; const d = daysUntil(k.dueDate); return d >= 0 && d <= 7; }).length;
    const buktiPotongBelum = all.filter((k) => k.taxType === "pph23_dipotong" && !k.buktiPotongReceived && k.settlementStatus !== "sudah_disetor").length;
    return { totalBelumSetor, terlambat, jatuhTempo7, buktiPotongBelum };
  }, [data]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Landmark className="size-5 text-muted-foreground" />
        <h1 className="text-xl font-semibold tracking-tight">Pajak</h1>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <KpiCard label="Total Belum Setor" value={formatRupiahCompact(kpi.totalBelumSetor)} icon={Landmark} />
        <KpiCard label="Terlambat" value={String(kpi.terlambat)} sub={kpi.terlambat > 0 ? "kewajiban jatuh tempo" : "tidak ada yang terlambat"} icon={AlertTriangle} danger={kpi.terlambat > 0} />
        <KpiCard label="Jatuh Tempo 7 Hari" value={String(kpi.jatuhTempo7)} sub={kpi.jatuhTempo7 > 0 ? "kewajiban mendekati tenggat" : "tidak ada mendekati tenggat"} icon={AlertTriangle} warn={kpi.jatuhTempo7 > 0} />
        <KpiCard label="Bukti Potong Belum" value={String(kpi.buktiPotongBelum)} sub="PPh belum diterima" icon={FileX} warn={kpi.buktiPotongBelum > 0} />
      </div>

      {!configLoading && config && <KonfigurasiCard config={config} />}

      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <DataTable
          columns={columns}
          data={filteredData}
          loading={isLoading}
          searchColumns={["notes"]}
          searchPlaceholder="Cari keterangan…"
          emptyMessage="Belum ada kewajiban pajak"
          defaultSorting={[{ id: "taxPeriod", desc: true }]}
          rowActions={false}
          toolbarActions={
            <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={openFilter}>
              <SlidersHorizontal className="size-3.5" />
              Filter
              {hasFilter && <Badge variant="secondary" className="px-1.5 py-0 text-xs">{filterCount}</Badge>}
            </Button>
          }
        />
      )}

      <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader><DialogTitle>Filter Kewajiban Pajak</DialogTitle></DialogHeader>
          <div className="space-y-5 py-1">
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Jenis Pajak</p>
              <MultiSelectFilter options={JENIS_OPTIONS} value={pendingJenis} onChange={(v) => setPendingJenis(v as TaxType[])} placeholder="Pilih jenis pajak…" searchPlaceholder="Cari jenis…" noun="jenis" />
            </div>
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</p>
              <MultiSelectFilter options={STATUS_OPTIONS} value={pendingStatus} onChange={(v) => setPendingStatus(v as TaxSettlementStatus[])} placeholder="Pilih status…" searchPlaceholder="Cari status…" noun="status" />
            </div>
          </div>
          <DialogFooter className="flex-row items-center gap-2">
            <Button variant={hasPending ? "ghost" : "outline"} size="sm" className="mr-auto" onClick={resetFilter}>{hasPending ? "Reset" : "Tutup"}</Button>
            <Button size="sm" onClick={applyFilter}>Terapkan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SettleDialog entry={settlingEntry} onOpenChange={(open) => !open && setSettlingEntry(null)} />

      <AlertDialog open={!!unsettlingEntry} onOpenChange={(open) => !open && setUnsettlingEntry(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Batalkan status setor?</AlertDialogTitle>
            <AlertDialogDescription>
              Kewajiban ini akan dikembalikan ke status <strong>Belum Disetor</strong>. Jurnal arus kas yang
              sudah tercatat dari penyetoran sebelumnya tidak akan dihapus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              disabled={unsettling}
              onClick={async () => {
                if (!unsettlingEntry) return;
                await unsettle(unsettlingEntry.id);
                setUnsettlingEntry(null);
              }}
            >
              {unsettling ? "Memproses…" : "Batalkan"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
