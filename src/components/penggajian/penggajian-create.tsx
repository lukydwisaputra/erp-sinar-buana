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
import { formatRupiah, formatIntIDR, parseRupiah } from "@/lib/format";
import { calcSlip } from "@/lib/schemas/penggajian";
import { useCreateBatch } from "@/lib/query/penggajian";
import { karyawanFixtures } from "@/lib/fixtures/karyawan";
import type { Karyawan } from "@/lib/schemas/karyawan";

const activeKaryawan = karyawanFixtures.filter((k) => k.status === "aktif");

type SlipRow = {
  karyawanId: string;
  tunjangan: number;
  lembur: number;
  bonus: number;
  pph21Pct: number;
  bpjsPotongan: number;
};

function makeDefaultRow(karyawanId: string): SlipRow {
  const k = activeKaryawan.find((k) => k.id === karyawanId)!;
  return { karyawanId, tunjangan: k.tunjangan, lembur: 0, bonus: 0, pph21Pct: 0, bpjsPotongan: 0 };
}

const statusFilterOptions = [
  { label: "Tetap", value: "tetap" },
  { label: "Kontrak", value: "kontrak" },
  { label: "Probation", value: "probation" },
];

const inputCls =
  "w-full rounded px-1 py-0.5 text-right text-xs font-mono bg-transparent outline-none ring-inset focus:ring-1 focus:ring-ring hover:bg-muted/50 transition-colors";

function InlineMoneyInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [focused, setFocused] = React.useState(false);
  const [text, setText] = React.useState(value ? formatIntIDR(value) : "");

  React.useEffect(() => {
    if (!focused) setText(value ? formatIntIDR(value) : "");
  }, [value, focused]);

  return (
    <div className="flex items-center gap-0.5">
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
        className={inputCls}
      />
    </div>
  );
}

export function PenggajianCreate() {
  const router = useRouter();
  const createBatch = useCreateBatch();

  const [mulai, setMulai] = React.useState<Date | undefined>();
  const [selesai, setSelesai] = React.useState<Date | undefined>();

  const mulaiStr = mulai ? format(mulai, "yyyy-MM-dd") : "";
  const selesaiStr = selesai ? format(selesai, "yyyy-MM-dd") : "";
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [step, setStep] = React.useState<1 | 2>(1);
  const [rows, setRows] = React.useState<SlipRow[]>([]);

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
        return (
          <Badge variant={s === "tetap" ? "success" : s === "kontrak" ? "info" : "warning"} className="text-xs">
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </Badge>
        );
      },
    },
    {
      accessorKey: "gajiPokok", header: "Gaji Pokok",
      meta: { mono: true, className: "w-[20%]" },
      cell: ({ row }) => formatRupiah(row.original.gajiPokok),
    },
  ], [selectedIds]);

  const handleLanjut = () => {
    setRows(selectedIds.map(makeDefaultRow));
    setStep(2);
  };

  const updateRow = (idx: number, patch: Partial<SlipRow>) =>
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  const moneyInput = (val: number, onChange: (v: number) => void) => (
    <InlineMoneyInput value={val} onChange={onChange} />
  );

  function pph21Idr(row: SlipRow) {
    const k = activeKaryawan.find((k) => k.id === row.karyawanId)!;
    const kotor = k.gajiPokok * k.pengali + row.tunjangan + row.lembur + row.bonus;
    return Math.round(kotor * row.pph21Pct / 100);
  }

  const rowsValid = rows.every((row) => {
    const k = activeKaryawan.find((k) => k.id === row.karyawanId)!;
    const { penggajianBersih } = calcSlip({ ...k, ...row, pph21: pph21Idr(row) });
    return penggajianBersih >= 0;
  });

  const handleSimpan = async () => {
    const slips = rows.map((row) => {
      const k = activeKaryawan.find((k) => k.id === row.karyawanId)!;
      return {
        karyawanId: k.id, karyawanNama: k.nama, jabatan: k.jabatan,
        statusKepegawaian: k.statusKepegawaian, pengali: k.pengali, gajiPokok: k.gajiPokok,
        tunjangan: row.tunjangan, lembur: row.lembur, bonus: row.bonus,
        pph21: pph21Idr(row), bpjsPotongan: row.bpjsPotongan,
        bankNama: k.bank.nama, bankNomor: k.bank.nomor, bankAtasNama: k.bank.atasNama,
      };
    });
    const batch = await createBatch.mutateAsync({ periode: { mulai: mulaiStr, selesai: selesaiStr }, slips });
    router.push(`/penggajian/${batch.id}`);
  };

  const periodeValid = mulaiStr && selesaiStr && mulaiStr <= selesaiStr;
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
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Periode</span>
              <DatePicker value={mulai} onChange={setMulai} placeholder="Mulai" className="w-40" />
              <span className="text-muted-foreground text-sm">–</span>
              <DatePicker value={selesai} onChange={setSelesai} placeholder="Selesai" className="w-40" />
            </div>
            <Button disabled={!canLanjut} onClick={handleLanjut}>
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

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full table-fixed text-xs">
              <colgroup>
                <col className="w-[12%]" />
                <col className="w-[11%]" />
                <col className="w-[11%]" />
                <col className="w-[9%]" />
                <col className="w-[9%]" />
                <col className="w-[6%]" />
                <col className="w-[9%]" />
                <col className="w-[13%]" />
                <col className="w-[13%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-border bg-muted/50 text-xs font-medium text-muted-foreground uppercase">
                  <th className="px-3 py-2 text-left">Nama</th>
                  <th className="px-3 py-2 text-right">Gaji Efektif</th>
                  <th className="px-3 py-2 text-right">Tunjangan</th>
                  <th className="px-3 py-2 text-right">Lembur</th>
                  <th className="px-3 py-2 text-right">Bonus</th>
                  <th className="px-3 py-2 text-right">PPh 21</th>
                  <th className="px-3 py-2 text-right">BPJS</th>
                  <th className="px-3 py-2 text-right">Kotor</th>
                  <th className="px-3 py-2 text-right">Bersih</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  const k = activeKaryawan.find((k) => k.id === row.karyawanId)!;
                  const pph21Amount = pph21Idr(row);
                  const { gajiPokokEfektif, penggajianKotor, penggajianBersih } = calcSlip({ ...k, ...row, pph21: pph21Amount });
                  return (
                    <tr key={row.karyawanId} className="border-b border-border last:border-0">
                      <td className="px-2 py-1.5">
                        <p className="font-medium truncate">{k.nama}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{k.jabatan}</p>
                      </td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums">{formatRupiah(gajiPokokEfektif)}</td>
                      <td className="px-1 py-1">{moneyInput(row.tunjangan, (v) => updateRow(idx, { tunjangan: v }))}</td>
                      <td className="px-1 py-1">{moneyInput(row.lembur, (v) => updateRow(idx, { lembur: v }))}</td>
                      <td className="px-1 py-1">{moneyInput(row.bonus, (v) => updateRow(idx, { bonus: v }))}</td>
                      <td className="px-1 py-1">
                        <div className="flex items-center gap-0.5">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            step={0.1}
                            value={row.pph21Pct === 0 ? "" : row.pph21Pct}
                            placeholder="0"
                            onChange={(e) => updateRow(idx, { pph21Pct: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })}
                            className={inputCls}
                          />
                          <span className="text-xs text-muted-foreground shrink-0">%</span>
                        </div>
                      </td>
                      <td className="px-1 py-1">{moneyInput(row.bpjsPotongan, (v) => updateRow(idx, { bpjsPotongan: v }))}</td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums">{formatRupiah(penggajianKotor)}</td>
                      <td className={`px-3 py-2 text-right font-mono tabular-nums font-semibold ${penggajianBersih < 0 ? "text-destructive" : ""}`}>
                        {formatRupiah(penggajianBersih)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {rows.length > 0 && (() => {
                const totals = rows.reduce((acc, row) => {
                  const k = activeKaryawan.find((k) => k.id === row.karyawanId)!;
                  const pph21Amount = pph21Idr(row);
                  const { gajiPokokEfektif, penggajianKotor, penggajianBersih } = calcSlip({ ...k, ...row, pph21: pph21Amount });
                  return {
                    gajiEfektif: acc.gajiEfektif + gajiPokokEfektif,
                    tunjangan: acc.tunjangan + row.tunjangan,
                    lembur: acc.lembur + row.lembur,
                    bonus: acc.bonus + row.bonus,
                    pph21: acc.pph21 + pph21Amount,
                    bpjs: acc.bpjs + row.bpjsPotongan,
                    kotor: acc.kotor + penggajianKotor,
                    bersih: acc.bersih + penggajianBersih,
                  };
                }, { gajiEfektif: 0, tunjangan: 0, lembur: 0, bonus: 0, pph21: 0, bpjs: 0, kotor: 0, bersih: 0 });
                const tc = "px-1 py-2 text-right font-mono tabular-nums whitespace-nowrap";
                return (
                  <tfoot>
                    <tr className="border-t-2 border-border bg-muted/50 font-semibold">
                      <td className="px-2 py-2">Total</td>
                      <td className={tc}>{formatRupiah(totals.gajiEfektif)}</td>
                      <td className={tc}>{formatRupiah(totals.tunjangan)}</td>
                      <td className={tc}>{formatRupiah(totals.lembur)}</td>
                      <td className={tc}>{formatRupiah(totals.bonus)}</td>
                      <td className={tc}>{formatRupiah(totals.pph21)}</td>
                      <td className={tc}>{formatRupiah(totals.bpjs)}</td>
                      <td className={tc}>{formatRupiah(totals.kotor)}</td>
                      <td className={`${tc} ${totals.bersih < 0 ? "text-destructive" : ""}`}>{formatRupiah(totals.bersih)}</td>
                    </tr>
                  </tfoot>
                );
              })()}
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
