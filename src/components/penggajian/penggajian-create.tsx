"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowLeft, ChevronRight, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import { DataTable } from "@/components/shared/data-table";
import { SectionLabel } from "@/components/shared/detail-drawer";
import { ComponentsEditor } from "@/components/penggajian/components-editor";
import { formatRupiah, formatIntIDR, parseRupiah } from "@/lib/format";
import { calcSlip, type CreateComponentInput } from "@/lib/schemas/penggajian";
import { useCreateBatch } from "@/lib/query/penggajian";
import { useKaryawanList } from "@/lib/query/karyawan";
import { apiClient } from "@/lib/api-client";
import type { Karyawan } from "@/lib/schemas/karyawan";

type SlipRow = {
  karyawanId: string;
  components: CreateComponentInput[];
  lembur: number;
  bonus: number;
  pph21: number;
};

const statusFilterOptions = [
  { label: "Tetap", value: "tetap" },
  { label: "Kontrak", value: "kontrak" },
  { label: "Probation", value: "probation" },
];

function InlineMoneyInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [focused, setFocused] = React.useState(false);
  const [text, setText] = React.useState(value ? formatIntIDR(value) : "");

  React.useEffect(() => {
    if (!focused) setText(value ? formatIntIDR(value) : "");
  }, [value, focused]);

  return (
    <div className="flex items-center gap-1 rounded-md border border-input bg-transparent px-2 h-9 focus-within:ring-1 focus-within:ring-ring">
      <span className="text-xs text-muted-foreground shrink-0">Rp</span>
      <input
        inputMode="numeric"
        value={focused ? text : (value ? formatIntIDR(value) : "")}
        placeholder="0"
        onFocus={() => setFocused(true)}
        onChange={(e) => {
          setText(e.target.value);
          onChange(parseRupiah(e.target.value));
        }}
        onBlur={() => {
          setFocused(false);
          setText(value ? formatIntIDR(value) : "");
        }}
        className="w-full min-w-0 text-right text-sm font-mono bg-transparent outline-none"
      />
    </div>
  );
}

export function PenggajianCreate() {
  const router = useRouter();
  const createBatch = useCreateBatch();
  const { data: allKaryawan = [] } = useKaryawanList();
  const activeKaryawan = React.useMemo(
    () => allKaryawan.filter((k) => k.status === "aktif"),
    [allKaryawan],
  );

  const [mulai, setMulai] = React.useState<Date | undefined>();
  const [selesai, setSelesai] = React.useState<Date | undefined>();
  const [tanggalBayar, setTanggalBayar] = React.useState<Date | undefined>();

  const mulaiStr = mulai ? format(mulai, "yyyy-MM-dd") : "";
  const selesaiStr = selesai ? format(selesai, "yyyy-MM-dd") : "";
  const tanggalBayarStr = tanggalBayar ? format(tanggalBayar, "yyyy-MM-dd") : "";
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [step, setStep] = React.useState<1 | 2>(1);
  const [rows, setRows] = React.useState<SlipRow[]>([]);
  const [loadingDefaults, setLoadingDefaults] = React.useState(false);

  const findKaryawan = React.useCallback(
    (id: string) => activeKaryawan.find((k) => k.id === id)!,
    [activeKaryawan],
  );

  const toggleKaryawan = (id: string) =>
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const toggleAll = () => {
    if (selectedIds.length === activeKaryawan.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(activeKaryawan.map((k) => k.id));
    }
  };

  const karyawanColumns: ColumnDef<Karyawan>[] = React.useMemo(() => [
    {
      id: "select",
      header: () => (
        <Checkbox
          checked={selectedIds.length === activeKaryawan.length ? true : selectedIds.length > 0 ? "indeterminate" : false}
          onCheckedChange={toggleAll}
          aria-label="Pilih semua"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={selectedIds.includes(row.original.id)}
          onCheckedChange={() => toggleKaryawan(row.original.id)}
          aria-label={`Pilih ${row.original.nama}`}
        />
      ),
      enableSorting: false,
      meta: { collapse: true },
    },
    { accessorKey: "nama", header: "Nama", meta: { className: "w-[30%]" }, cell: ({ row }) => <span className="font-medium">{row.original.nama}</span> },
    { accessorKey: "jabatan", header: "Jabatan", meta: { className: "w-[30%]" } },
    {
      accessorKey: "statusKepegawaian", header: "Status",
      meta: { className: "w-[20%]" },
      cell: ({ row }) => {
        const s = row.original.statusKepegawaian;
        return <Badge variant="secondary" className="text-xs">{s}</Badge>;
      },
    },
    {
      accessorKey: "gajiPokok", header: "Gaji Pokok",
      meta: { mono: true, className: "w-[20%]" },
      cell: ({ row }) => formatRupiah(row.original.gajiPokok),
    },
  ], [selectedIds, activeKaryawan]);

  const handleLanjut = async () => {
    setLoadingDefaults(true);
    try {
      const defaultsPerEmployee = await Promise.all(
        selectedIds.map((id) => apiClient.get<CreateComponentInput[]>(`/api/penggajian/defaults/${id}`)),
      );
      setRows(selectedIds.map((id, i) => ({
        karyawanId: id, components: defaultsPerEmployee[i], lembur: 0, bonus: 0, pph21: 0,
      })));
      setStep(2);
    } finally {
      setLoadingDefaults(false);
    }
  };

  const updateRow = (idx: number, patch: Partial<SlipRow>) =>
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  const rowsValid = rows.every((row) => {
    const k = findKaryawan(row.karyawanId);
    const { penggajianBersih } = calcSlip({ gajiPokok: k.gajiPokok, pengali: k.pengali, ...row });
    return penggajianBersih >= 0;
  });

  const handleSimpan = async () => {
    const slips = rows.map((row) => ({
      karyawanId: row.karyawanId,
      components: row.components,
      lembur: row.lembur, bonus: row.bonus, pph21: row.pph21,
    }));
    const batch = await createBatch.mutateAsync({ periode: { mulai: mulaiStr, selesai: selesaiStr }, tanggalBayar: tanggalBayarStr, slips });
    router.push(`/penggajian/${encodeURIComponent(batch.id)}`);
  };

  const periodeValid = mulaiStr && selesaiStr && mulaiStr <= selesaiStr && !!tanggalBayarStr;
  const canLanjut = !!periodeValid && selectedIds.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => step === 2 ? setStep(1) : router.back()} className="size-8">
          <ArrowLeft className="size-4" />
        </Button>
        <div className="flex items-center gap-2">
          <Wallet className="size-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold tracking-tight">Buat Penggajian</h1>
        </div>
        <div className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className={step === 1 ? "font-semibold text-foreground" : ""}>1. Pilih Karyawan</span>
          <ChevronRight className="size-3" />
          <span className={step === 2 ? "font-semibold text-foreground" : ""}>2. Komponen Gaji</span>
        </div>
      </div>

      {/* Step 1: Pilih Karyawan */}
      {step === 1 && (
        <>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">Periode</span>
                <DatePicker value={mulai} onChange={setMulai} placeholder="Mulai" className="w-40" />
                <span className="text-muted-foreground text-sm">–</span>
                <DatePicker value={selesai} onChange={setSelesai} placeholder="Selesai" className="w-40" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">Tanggal Bayar</span>
                <DatePicker value={tanggalBayar} onChange={setTanggalBayar} placeholder="Pilih tanggal" className="w-40" />
              </div>
            </div>
            <Button disabled={!canLanjut} loading={loadingDefaults} onClick={handleLanjut}>
              Atur Komponen Gaji {selectedIds.length > 0 && `(${selectedIds.length} karyawan)`} <ChevronRight className="size-4 ml-1" />
            </Button>
          </div>

          <section>
            <div className="flex items-center justify-between mb-2">
              <SectionLabel>Pilih Karyawan</SectionLabel>
              {selectedIds.length > 0 && (
                <span className="text-sm text-muted-foreground">{selectedIds.length} dipilih</span>
              )}
            </div>
            <DataTable
              columns={karyawanColumns}
              data={activeKaryawan}
              searchColumns={["nama", "jabatan"]}
              searchPlaceholder="Cari nama atau jabatan…"
              filterColumn="statusKepegawaian"
              filterPlaceholder="Semua status"
              filterOptions={statusFilterOptions}
              rowActions={false}
              compact
              initialPageSize={10}
              emptyMessage="Tidak ada karyawan aktif"
            />
          </section>
        </>
      )}

      {/* Step 2: Komponen Gaji */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {selectedIds.length} karyawan &middot; Periode {mulai && format(mulai, "d MMM yyyy")} – {selesai && format(selesai, "d MMM yyyy")}
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setStep(1)}>
                <ArrowLeft className="size-4 mr-1" /> Ubah Pilihan
              </Button>
              <Button
                size="sm"
                onClick={handleSimpan}
                disabled={!rowsValid || createBatch.isPending}
                loading={createBatch.isPending}
              >
                Simpan Penggajian
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {rows.map((row, idx) => {
              const k = findKaryawan(row.karyawanId);
              const { gajiPokokEfektif, penggajianKotor, penggajianBersih } = calcSlip({
                gajiPokok: k.gajiPokok, pengali: k.pengali, ...row,
              });
              return (
                <div key={row.karyawanId} className="rounded-lg border border-border p-3">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-base font-medium">{k.nama}</p>
                      <p className="text-sm text-muted-foreground">{k.jabatan} &middot; Gaji Efektif {formatRupiah(gajiPokokEfektif)}</p>
                    </div>
                    <div className="flex items-center gap-4 text-right text-sm">
                      <div>
                        <p className="text-muted-foreground">Kotor</p>
                        <p className="font-mono font-medium">{formatRupiah(penggajianKotor)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Bersih</p>
                        <p className={`font-mono font-semibold ${penggajianBersih < 0 ? "text-destructive" : ""}`}>{formatRupiah(penggajianBersih)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mb-3 grid grid-cols-3 gap-3 rounded-md bg-muted/30 p-3">
                    <div>
                      <label className="text-xs text-muted-foreground">Lembur</label>
                      <InlineMoneyInput value={row.lembur} onChange={(v) => updateRow(idx, { lembur: v })} />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Bonus</label>
                      <InlineMoneyInput value={row.bonus} onChange={(v) => updateRow(idx, { bonus: v })} />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">PPh 21</label>
                      <InlineMoneyInput value={row.pph21} onChange={(v) => updateRow(idx, { pph21: v })} />
                    </div>
                  </div>

                  <div>
                    <p className="mb-1.5 text-sm font-medium text-muted-foreground">Komponen (Tunjangan/Potongan)</p>
                    <ComponentsEditor components={row.components} onChange={(v) => updateRow(idx, { components: v })} />
                  </div>
                </div>
              );
            })}
          </div>

          {rows.length > 0 && (() => {
            const totals = rows.reduce((acc, row) => {
              const k = findKaryawan(row.karyawanId);
              const { penggajianKotor, penggajianBersih } = calcSlip({ gajiPokok: k.gajiPokok, pengali: k.pengali, ...row });
              return { kotor: acc.kotor + penggajianKotor, bersih: acc.bersih + penggajianBersih };
            }, { kotor: 0, bersih: 0 });
            return (
              <div className="flex items-center justify-end gap-6 rounded-lg border border-border bg-muted/30 px-4 py-2 text-sm">
                <span className="text-muted-foreground">Total Kotor <span className="font-mono font-semibold text-foreground">{formatRupiah(totals.kotor)}</span></span>
                <span className="text-muted-foreground">Total Bersih <span className={`font-mono font-semibold ${totals.bersih < 0 ? "text-destructive" : "text-foreground"}`}>{formatRupiah(totals.bersih)}</span></span>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
