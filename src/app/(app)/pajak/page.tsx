"use client";
import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { ColumnDef } from "@tanstack/react-table";
import {
  AlertTriangle, ChevronDown, ChevronUp,
  FileX, Landmark, MoreHorizontal, Plus, SlidersHorizontal,
} from "lucide-react";
import { DataTable } from "@/components/shared/data-table";
import { ErrorState } from "@/components/shared/error-state";
import { FormSheet } from "@/components/shared/form-sheet";
import { MoneyInput } from "@/components/shared/money-input";
import { MultiSelectFilter, type MultiSelectOption } from "@/components/shared/multi-select-filter";
import { StatusBadge, type StatusBadgeConfig } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldLabel, FieldError, FieldDescription } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  InputGroup, InputGroupAddon, InputGroupInput, InputGroupText,
} from "@/components/ui/input-group";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { formatRupiah, formatRupiahCompact } from "@/lib/format";
import { onFormInvalid } from "@/lib/form-toast";
import {
  useKewajibanPajakList,
  useCreateKewajibanPajak,
  useSetKewajibanStatus,
  useSetBuktiPotong,
} from "@/lib/query/kewajiban-pajak";
import { usePajakConfig, useUpdatePajakConfig } from "@/lib/query/pajak-config";
import {
  kewajibanJenis,
  type KewajibanJenis,
  type KewajibanPajak,
} from "@/lib/schemas/kewajiban-pajak";
import type { PajakConfig } from "@/lib/schemas/pajak-config";

// ── Helpers ──────────────────────────────────────────────────────────────

function tanggalID(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function daysUntil(iso: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((new Date(iso).getTime() - now.getTime()) / 86_400_000);
}

const JENIS_META: Record<KewajibanJenis, { label: string; variant: "info" | "secondary" | "warning" | "destructive" }> = {
  ppn:       { label: "PPN",       variant: "info" },
  pph21:     { label: "PPh 21",    variant: "secondary" },
  pph23:     { label: "PPh 23",    variant: "warning" },
  pph_badan: { label: "PPh Badan", variant: "destructive" },
};

const JENIS_OPTIONS: MultiSelectOption[] = kewajibanJenis.options.map((v) => ({
  value: v,
  label: JENIS_META[v].label,
  variant: JENIS_META[v].variant,
}));

const STATUS_META: Record<KewajibanPajak["status"], StatusBadgeConfig> = {
  belum_setor: { label: "Belum Setor", variant: "warning" },
  disetor:     { label: "Disetor",     variant: "success" },
};

const STATUS_OPTIONS: MultiSelectOption[] = Object.entries(STATUS_META).map(([value, m]) => ({
  value, label: m.label, variant: m.variant,
}));

function JenisBadge({ jenis }: { jenis: KewajibanJenis }) {
  const m = JENIS_META[jenis];
  return <Badge variant={m.variant}>{m.label}</Badge>;
}

function JatuhTempoBadge({ iso, status }: { iso: string; status: KewajibanPajak["status"] }) {
  const days = daysUntil(iso);
  const label = tanggalID(iso);
  if (status === "disetor") return <span className="font-mono">{label}</span>;
  if (days < 0) return <span className="font-mono font-medium text-destructive">{label}</span>;
  if (days <= 7) return <span className="font-mono font-medium text-amber-600 dark:text-amber-400">{label}</span>;
  return <span className="font-mono">{label}</span>;
}

// ── Table columns ─────────────────────────────────────────────────────────

function makeColumns(
  onStatusChange: (item: KewajibanPajak) => void,
  onBuktiPotong: (id: string, diterima: boolean) => void,
  isUpdating: boolean,
): ColumnDef<KewajibanPajak>[] {
  return [
    {
      accessorKey: "id",
      header: "ID",
      meta: { mono: true },
      cell: ({ row }) => <span className="font-mono">{row.original.id}</span>,
    },
    {
      accessorKey: "jenis",
      header: "Jenis",
      cell: ({ row }) => <JenisBadge jenis={row.original.jenis} />,
    },
    {
      accessorKey: "periode",
      header: "Periode",
      meta: { mono: true },
      cell: ({ row }) => <span className="font-mono">{row.original.periode}</span>,
    },
    {
      accessorKey: "jumlah",
      header: "Jumlah",
      meta: { mono: true, className: "text-right" },
      cell: ({ row }) => (
        <span className="font-mono" title={formatRupiah(row.original.jumlah)}>
          {formatRupiahCompact(row.original.jumlah)}
        </span>
      ),
    },
    {
      accessorKey: "jatuhTempo",
      header: "Jatuh Tempo",
      cell: ({ row }) => (
        <JatuhTempoBadge iso={row.original.jatuhTempo} status={row.original.status} />
      ),
    },
    {
      accessorKey: "buktiPotongDiterima",
      header: "Bukti Potong",
      cell: ({ row }) => {
        const { jenis, buktiPotongDiterima } = row.original;
        if (jenis !== "pph23") return <span className="text-muted-foreground">—</span>;
        return buktiPotongDiterima
          ? <Badge variant="success">Diterima</Badge>
          : <Badge variant="destructive">Belum</Badge>;
      },
    },
    {
      accessorKey: "keterangan",
      header: "Keterangan",
      meta: { className: "min-w-48 text-muted-foreground" },
      cell: ({ row }) => row.original.keterangan || <span className="text-muted-foreground">—</span>,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status} map={STATUS_META} />,
    },
    {
      id: "actions",
      meta: { className: "w-10" },
      cell: ({ row }) => {
        const item = row.original;
        const isSetor = item.status === "disetor";
        const buktiSudah = item.buktiPotongDiterima;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8" disabled={isUpdating}>
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onStatusChange(item)}>
                {isSetor ? "Tandai Belum Setor" : "Tandai Sudah Setor"}
              </DropdownMenuItem>
              {item.jenis === "pph23" && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onBuktiPotong(item.id, !buktiSudah)}>
                    {buktiSudah ? "Tandai Bukti Potong Belum Diterima" : "Tandai Bukti Potong Diterima"}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}

// ── KPI strip ─────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  danger?: boolean;
  warn?: boolean;
}

function KpiCard({ label, value, sub, icon: Icon, danger, warn }: KpiCardProps) {
  return (
    <Card size="sm">
      <CardContent className="flex items-start justify-between gap-2 pt-0">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className={`font-mono text-lg font-semibold leading-tight ${danger ? "text-destructive" : warn ? "text-amber-600 dark:text-amber-400" : ""}`}>
            {value}
          </p>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
        <Icon className={`mt-0.5 size-5 shrink-0 ${danger ? "text-destructive" : warn ? "text-amber-500" : "text-muted-foreground"}`} />
      </CardContent>
    </Card>
  );
}

// ── Config card ───────────────────────────────────────────────────────────

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
  const tarifLabel = config.metode === "final_05"
    ? `${config.tarifFinalPersen}% dari omzet`
    : `${config.tarifBadanPersen}% dari laba kena pajak`;

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-sm">Konfigurasi PPh Badan</CardTitle>
        <CardAction className="flex items-center gap-1">
          {!editing && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setEditing(true); setOpen(true); }}>
              Ubah
            </Button>
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
              <div>
                <p className="text-xs text-muted-foreground">Metode</p>
                <p className="font-medium">{metodeLabel}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tarif</p>
                <p className="font-mono font-medium">{tarifLabel}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Ambang Omzet</p>
                <p className="font-mono font-medium" title={formatRupiah(config.ambangOmzet)}>
                  {formatRupiahCompact(config.ambangOmzet)}
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <Field>
                <FieldLabel>Metode PPh Badan</FieldLabel>
                <Select
                  value={metode}
                  onValueChange={(v) => form.setValue("metode", v as "final_05" | "badan_22")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
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
                    <InputGroupAddon align="inline-end">
                      <InputGroupText>%</InputGroupText>
                    </InputGroupAddon>
                  </InputGroup>
                  {errors.tarifFinalPersen && <FieldError>{errors.tarifFinalPersen.message}</FieldError>}
                </Field>
              ) : (
                <Field>
                  <FieldLabel>Tarif Badan (%)</FieldLabel>
                  <InputGroup>
                    <InputGroupInput type="number" step="0.1" {...register("tarifBadanPersen")} />
                    <InputGroupAddon align="inline-end">
                      <InputGroupText>%</InputGroupText>
                    </InputGroupAddon>
                  </InputGroup>
                  {errors.tarifBadanPersen && <FieldError>{errors.tarifBadanPersen.message}</FieldError>}
                </Field>
              )}

              <Field>
                <FieldLabel>Ambang Omzet (Rp)</FieldLabel>
                <MoneyInput
                  key={config.ambangOmzet}
                  defaultValue={config.ambangOmzet}
                  onValueChange={(v) => form.setValue("ambangOmzet", v)}
                  className="w-full"
                />
                <FieldDescription>Batas omzet tahunan untuk penentuan metode pajak.</FieldDescription>
                {errors.ambangOmzet && <FieldError>{errors.ambangOmzet.message}</FieldError>}
              </Field>

              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={isPending}>
                  {isPending ? "Menyimpan…" : "Simpan"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => { setEditing(false); reset(); }}
                >
                  Batal
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// ── Create form ───────────────────────────────────────────────────────────

const kewajibanFormSchema = z.object({
  jenis: kewajibanJenis,
  periode: z.string().regex(/^\d{4}-\d{2}$/, "Format: YYYY-MM (contoh: 2026-06)"),
  jumlah: z.coerce.number({ message: "Jumlah wajib diisi." }).min(1, "Jumlah wajib diisi."),
  jatuhTempo: z.string().min(1, "Jatuh tempo wajib diisi."),
  buktiPotongDiterima: z.boolean(),
  keterangan: z.string(),
});
type KewajibanForm = z.input<typeof kewajibanFormSchema>;

function KewajibanCreateForm({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { mutateAsync, isPending } = useCreateKewajibanPajak();
  const form = useForm<KewajibanForm>({
    resolver: zodResolver(kewajibanFormSchema),
    defaultValues: {
      jenis: "ppn",
      periode: "",
      jumlah: undefined,
      jatuhTempo: "",
      buktiPotongDiterima: false,
      keterangan: "",
    },
  });
  const { register, handleSubmit, control, watch, reset, setValue, formState: { errors } } = form;
  const jenis = watch("jenis");

  const onSubmit = handleSubmit(async (values) => {
    const isBpjs = values.jenis !== "pph23";
    await mutateAsync({
      jenis: values.jenis,
      periode: values.periode,
      jumlah: Number(values.jumlah),
      jatuhTempo: values.jatuhTempo,
      status: "belum_setor",
      buktiPotongDiterima: isBpjs ? true : values.buktiPotongDiterima,
      keterangan: values.keterangan,
    });
    onOpenChange(false);
    reset();
  }, onFormInvalid);

  return (
    <FormSheet
      open={open}
      onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}
      title="Tambah Kewajiban Pajak"
      description="Catat kewajiban pajak baru untuk dipantau dan disetor."
      onSubmit={onSubmit}
      submitLabel={isPending ? "Menyimpan…" : "Simpan"}
    >
      <Field>
        <FieldLabel>Jenis Pajak</FieldLabel>
        <Controller
          name="jenis"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih jenis pajak…" />
              </SelectTrigger>
              <SelectContent>
                {kewajibanJenis.options.map((v) => (
                  <SelectItem key={v} value={v}>{JENIS_META[v].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.jenis && <FieldError>{errors.jenis.message}</FieldError>}
      </Field>

      <Field>
        <FieldLabel>Periode</FieldLabel>
        <Input placeholder="YYYY-MM" {...register("periode")} />
        <FieldDescription>Contoh: 2026-06</FieldDescription>
        {errors.periode && <FieldError>{errors.periode.message}</FieldError>}
      </Field>

      <Field>
        <FieldLabel>Jumlah (Rp)</FieldLabel>
        <MoneyInput
          defaultValue={0}
          onValueChange={(v) => setValue("jumlah", v, { shouldValidate: true })}
          className="w-full"
        />
        {errors.jumlah && <FieldError>{errors.jumlah.message}</FieldError>}
      </Field>

      <Field>
        <FieldLabel>Jatuh Tempo</FieldLabel>
        <Controller
          name="jatuhTempo"
          control={control}
          render={({ field }) => (
            <DatePicker
              value={field.value ? new Date(field.value) : undefined}
              onChange={(d) => setValue("jatuhTempo", d ? d.toISOString().slice(0, 10) : "")}
            />
          )}
        />
        {errors.jatuhTempo && <FieldError>{errors.jatuhTempo.message}</FieldError>}
      </Field>

      {jenis === "pph23" && (
        <Field>
          <div className="flex items-center justify-between gap-2">
            <FieldLabel className="mb-0">Bukti Potong Diterima</FieldLabel>
            <Controller
              name="buktiPotongDiterima"
              control={control}
              render={({ field }) => (
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
          </div>
          <FieldDescription>
            Apakah bukti potong PPh 23 dari klien sudah diterima?
          </FieldDescription>
        </Field>
      )}

      <Field>
        <FieldLabel>Keterangan</FieldLabel>
        <Textarea
          placeholder="Catatan tambahan…"
          rows={3}
          {...register("keterangan")}
        />
      </Field>
    </FormSheet>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function Page() {
  const [createOpen, setCreateOpen] = React.useState(false);
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [pendingJenis, setPendingJenis] = React.useState<KewajibanJenis[]>([]);
  const [pendingStatus, setPendingStatus] = React.useState<KewajibanPajak["status"][]>([]);
  const [appliedJenis, setAppliedJenis] = React.useState<KewajibanJenis[]>([]);
  const [appliedStatus, setAppliedStatus] = React.useState<KewajibanPajak["status"][]>([]);
  const [confirmItem, setConfirmItem] = React.useState<KewajibanPajak | null>(null);

  const { data, isLoading, isError, refetch } = useKewajibanPajakList();
  const { data: config, isLoading: configLoading } = usePajakConfig();
  const { mutate: setStatus, isPending: isUpdating } = useSetKewajibanStatus();
  const { mutate: setBuktiPotong, isPending: isBuktiUpdating } = useSetBuktiPotong();

  const hasFilter = appliedJenis.length > 0 || appliedStatus.length > 0;
  const hasPending = pendingJenis.length > 0 || pendingStatus.length > 0;
  const filterCount = appliedJenis.length + appliedStatus.length;

  function openFilter() {
    setPendingJenis(appliedJenis);
    setPendingStatus(appliedStatus);
    setFilterOpen(true);
  }
  function applyFilter() {
    setAppliedJenis(pendingJenis);
    setAppliedStatus(pendingStatus);
    setFilterOpen(false);
  }
  function resetFilter() {
    if (hasPending) {
      setPendingJenis([]);
      setPendingStatus([]);
    } else {
      setFilterOpen(false);
    }
  }

  const filteredData = React.useMemo(() => {
    let base = data ?? [];
    if (appliedJenis.length > 0) base = base.filter((k) => appliedJenis.includes(k.jenis));
    if (appliedStatus.length > 0) base = base.filter((k) => appliedStatus.includes(k.status));
    return base;
  }, [data, appliedJenis, appliedStatus]);

  // KPI computations
  const kpi = React.useMemo(() => {
    const all = data ?? [];
    const belumSetor = all.filter((k) => k.status === "belum_setor");
    const totalBelumSetor = belumSetor.reduce((s, k) => s + k.jumlah, 0);
    const terlambat = belumSetor.filter((k) => daysUntil(k.jatuhTempo) < 0).length;
    const jatuhTempo7 = belumSetor.filter((k) => { const d = daysUntil(k.jatuhTempo); return d >= 0 && d <= 7; }).length;
    const buktiPotongBelum = all.filter((k) => k.jenis === "pph23" && !k.buktiPotongDiterima && k.status !== "disetor").length;
    return { totalBelumSetor, terlambat, jatuhTempo7, buktiPotongBelum };
  }, [data]);

  const anyUpdating = isUpdating || isBuktiUpdating;
  const columns = makeColumns(
    (item) => setConfirmItem(item),
    (id, diterima) => setBuktiPotong({ id, diterima }),
    anyUpdating,
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Landmark className="size-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold tracking-tight">Pajak</h1>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" /> Tambah Kewajiban
        </Button>
      </div>

      <KewajibanCreateForm open={createOpen} onOpenChange={setCreateOpen} />

      <AlertDialog open={!!confirmItem} onOpenChange={(o) => { if (!o) setConfirmItem(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmItem?.status === "disetor" ? "Batalkan Setor?" : "Konfirmasi Sudah Setor?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmItem?.status === "disetor"
                ? `${JENIS_META[confirmItem.jenis]?.label} Masa ${confirmItem.periode} akan ditandai kembali sebagai Belum Setor.`
                : `${confirmItem ? JENIS_META[confirmItem.jenis]?.label : ""} Masa ${confirmItem?.periode} akan ditandai Sudah Setor.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!confirmItem) return;
                const next = confirmItem.status === "disetor" ? "belum_setor" : "disetor";
                setStatus({ id: confirmItem.id, status: next });
                setConfirmItem(null);
              }}
            >
              Ya, Ubah Status
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <KpiCard
          label="Total Belum Setor"
          value={formatRupiahCompact(kpi.totalBelumSetor)}
          icon={Landmark}
        />
        <KpiCard
          label="Terlambat"
          value={String(kpi.terlambat)}
          sub={kpi.terlambat > 0 ? "kewajiban jatuh tempo" : "tidak ada yang terlambat"}
          icon={AlertTriangle}
          danger={kpi.terlambat > 0}
        />
        <KpiCard
          label="Jatuh Tempo 7 Hari"
          value={String(kpi.jatuhTempo7)}
          sub={kpi.jatuhTempo7 > 0 ? "kewajiban mendekati tenggat" : "tidak ada mendekati tenggat"}
          icon={AlertTriangle}
          warn={kpi.jatuhTempo7 > 0}
        />
        <KpiCard
          label="Bukti Potong Belum"
          value={String(kpi.buktiPotongBelum)}
          sub="PPh 23 belum diterima"
          icon={FileX}
          warn={kpi.buktiPotongBelum > 0}
        />
      </div>

      {/* Config card */}
      {!configLoading && config && <KonfigurasiCard config={config} />}

      {/* Kewajiban table */}
      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <DataTable
          columns={columns}
          data={filteredData}
          loading={isLoading}
          searchColumns={["id", "keterangan"]}
          searchPlaceholder="Cari ID atau keterangan…"
          emptyMessage="Belum ada kewajiban pajak"
          defaultSorting={[{ id: "id", desc: true }]}
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

      {/* Filter dialog */}
      <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Filter Kewajiban Pajak</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-1">
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Jenis Pajak</p>
              <MultiSelectFilter
                options={JENIS_OPTIONS}
                value={pendingJenis}
                onChange={(v) => setPendingJenis(v as KewajibanJenis[])}
                placeholder="Pilih jenis pajak…"
                searchPlaceholder="Cari jenis…"
                noun="jenis"
              />
            </div>

            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</p>
              <MultiSelectFilter
                options={STATUS_OPTIONS}
                value={pendingStatus}
                onChange={(v) => setPendingStatus(v as KewajibanPajak["status"][])}
                placeholder="Pilih status…"
                searchPlaceholder="Cari status…"
                noun="status"
              />
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
