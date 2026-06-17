"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronRight, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { SectionLabel } from "@/components/shared/detail-drawer";
import { formatRupiahCompact } from "@/lib/format";
import { calcSlip } from "@/lib/schemas/penggajian";
import { useCreateBatch } from "@/lib/query/penggajian";
import { karyawanFixtures } from "@/lib/fixtures/karyawan";

const activeKaryawan = karyawanFixtures.filter((k) => k.status === "aktif");

type SlipRow = {
  karyawanId: string;
  tunjangan: number;
  lembur: number;
  bonus: number;
  pph21: number;
  bpjsPotongan: number;
};

function makeDefaultRow(karyawanId: string): SlipRow {
  const k = activeKaryawan.find((k) => k.id === karyawanId)!;
  return { karyawanId, tunjangan: k.tunjangan, lembur: 0, bonus: 0, pph21: 0, bpjsPotongan: 0 };
}

const colGrid = "160px 100px 90px 80px 80px 90px 90px 110px 110px";
const inputCls =
  "w-full rounded px-1.5 py-0.5 text-right text-sm font-mono bg-transparent outline-none ring-inset focus:ring-1 focus:ring-ring hover:bg-muted/50 transition-colors";

export function PenggajianCreate() {
  const router = useRouter();
  const createBatch = useCreateBatch();

  const [mulai, setMulai] = React.useState("");
  const [selesai, setSelesai] = React.useState("");
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [phase, setPhase] = React.useState<"select" | "table">("select");
  const [rows, setRows] = React.useState<SlipRow[]>([]);

  const toggleKaryawan = (id: string) =>
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const handleLanjut = () => {
    setRows(selectedIds.map(makeDefaultRow));
    setPhase("table");
  };

  const updateRow = (idx: number, patch: Partial<SlipRow>) =>
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  const numInput = (val: number, onChange: (v: number) => void) => (
    <input
      type="number"
      min={0}
      value={val === 0 ? "" : val}
      placeholder="0"
      onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
      className={inputCls}
    />
  );

  const rowsValid = rows.every((row) => {
    const k = activeKaryawan.find((k) => k.id === row.karyawanId)!;
    const { penggajianBersih } = calcSlip({ ...k, ...row });
    return penggajianBersih >= 0;
  });

  const handleSimpan = async () => {
    const slips = rows.map((row) => {
      const k = activeKaryawan.find((k) => k.id === row.karyawanId)!;
      return {
        karyawanId: k.id, karyawanNama: k.nama, jabatan: k.jabatan,
        statusKepegawaian: k.statusKepegawaian, pengali: k.pengali, gajiPokok: k.gajiPokok,
        tunjangan: row.tunjangan, lembur: row.lembur, bonus: row.bonus,
        pph21: row.pph21, bpjsPotongan: row.bpjsPotongan,
        bankNama: k.bank.nama, bankNomor: k.bank.nomor, bankAtasNama: k.bank.atasNama,
      };
    });
    const batch = await createBatch.mutateAsync({ periode: { mulai, selesai }, slips });
    router.push(`/penggajian/${batch.id}`);
  };

  const periodeValid = mulai && selesai && mulai <= selesai;
  const canLanjut = !!periodeValid && selectedIds.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="size-8">
          <ArrowLeft className="size-4" />
        </Button>
        <div className="flex items-center gap-2">
          <Wallet className="size-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold tracking-tight">Buat Penggajian</h1>
        </div>
      </div>

      <div className="space-y-4">
        <section>
          <SectionLabel>Periode</SectionLabel>
          <div className="flex items-center gap-3">
            <Input type="date" value={mulai} onChange={(e) => setMulai(e.target.value)} className="w-44" />
            <span className="text-muted-foreground text-sm">–</span>
            <Input type="date" value={selesai} onChange={(e) => setSelesai(e.target.value)} className="w-44" />
          </div>
        </section>

        <section>
          <SectionLabel>Pilih Karyawan</SectionLabel>
          <div className="space-y-2">
            {activeKaryawan.map((k) => (
              <label key={k.id} className="flex cursor-pointer items-center gap-2.5">
                <Checkbox checked={selectedIds.includes(k.id)} onCheckedChange={() => toggleKaryawan(k.id)} />
                <span className="text-sm font-medium">{k.nama}</span>
                <span className="text-xs text-muted-foreground">{k.jabatan}</span>
                <Badge
                  variant={k.statusKepegawaian === "tetap" ? "success" : k.statusKepegawaian === "kontrak" ? "info" : "warning"}
                  className="ml-auto text-xs"
                >
                  {k.statusKepegawaian} ×{k.pengali}
                </Badge>
              </label>
            ))}
          </div>
        </section>

        {phase === "select" && (
          <Button disabled={!canLanjut} onClick={handleLanjut}>
            Lanjut <ChevronRight className="size-4 ml-1" />
          </Button>
        )}
      </div>

      {phase === "table" && (
        <div className="space-y-3">
          <SectionLabel>Komponen Gaji</SectionLabel>
          <div className="overflow-x-auto rounded-lg border border-border">
            <div
              className="grid items-center gap-1 px-2 pb-1 pt-2 text-xs font-medium text-muted-foreground"
              style={{ gridTemplateColumns: colGrid }}
            >
              <span>Nama</span>
              <span className="text-right">Gaji Efektif</span>
              <span className="text-right">Tunjangan</span>
              <span className="text-right">Lembur</span>
              <span className="text-right">Bonus</span>
              <span className="text-right">PPh 21</span>
              <span className="text-right">BPJS</span>
              <span className="text-right">Kotor</span>
              <span className="text-right">Bersih</span>
            </div>
            {rows.map((row, idx) => {
              const k = activeKaryawan.find((k) => k.id === row.karyawanId)!;
              const { gajiPokokEfektif, penggajianKotor, penggajianBersih } = calcSlip({ ...k, ...row });
              return (
                <div
                  key={row.karyawanId}
                  className="grid items-center gap-1 border-t border-border px-2 py-1.5"
                  style={{ gridTemplateColumns: colGrid }}
                >
                  <div>
                    <p className="text-sm font-medium truncate">{k.nama}</p>
                    <p className="text-xs text-muted-foreground">{k.statusKepegawaian}</p>
                  </div>
                  <span className="text-right text-sm font-mono tabular-nums">{formatRupiahCompact(gajiPokokEfektif)}</span>
                  {numInput(row.tunjangan, (v) => updateRow(idx, { tunjangan: v }))}
                  {numInput(row.lembur, (v) => updateRow(idx, { lembur: v }))}
                  {numInput(row.bonus, (v) => updateRow(idx, { bonus: v }))}
                  {numInput(row.pph21, (v) => updateRow(idx, { pph21: v }))}
                  {numInput(row.bpjsPotongan, (v) => updateRow(idx, { bpjsPotongan: v }))}
                  <span className="text-right text-sm font-mono tabular-nums">{formatRupiahCompact(penggajianKotor)}</span>
                  <span className={`text-right text-sm font-mono tabular-nums font-semibold ${penggajianBersih < 0 ? "text-destructive" : ""}`}>
                    {formatRupiahCompact(penggajianBersih)}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <Button variant="outline" onClick={() => setPhase("select")}>← Ubah Pilihan</Button>
            <Button
              onClick={handleSimpan}
              disabled={!rowsValid || createBatch.isPending}
              loading={createBatch.isPending}
            >
              Simpan Penggajian
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
