"use client";

import * as React from "react";
import { Trash2Icon, Plus, Minus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MoneyInput } from "@/components/shared/money-input";
import { formatRupiah } from "@/lib/format";
import { rabRowTotal, type RabRow } from "@/lib/sph-templates";
import { cn } from "@/lib/utils";

type Rab = { personil: RabRow[]; langsung: RabRow[] };
type Jadwal = { kegiatan: string[]; highlights: number[][]; bulan: number };

function rowsTotal(rows: RabRow[]): number {
  return rows.reduce((s, r) => s + rabRowTotal(r), 0);
}

export function ServiceRabJadwalEditor({
  serviceName,
  rab,
  jadwal,
  onChange,
  trigger,
}: {
  serviceName: string;
  rab: Rab;
  jadwal: Jadwal;
  onChange: (patch: { rab?: Rab; jadwal?: Jadwal }) => void;
  trigger: React.ReactNode;
}): React.JSX.Element {
  const setRab = (next: Rab) => onChange({ rab: next });
  const setJadwal = (next: Jadwal) => onChange({ jadwal: next });

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="w-[80vw] h-[80vh] !max-w-[80vw] p-0 flex flex-col overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-3 border-b">
          <DialogTitle>
            Kelola RAB &amp; Jadwal — {serviceName || "Layanan"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <Tabs defaultValue="rab">
            <TabsList>
              <TabsTrigger value="rab">RAB</TabsTrigger>
              <TabsTrigger value="jadwal">Estimasi Jadwal</TabsTrigger>
            </TabsList>

            <TabsContent value="rab" className="mt-6">
              <RabEditor rab={rab} onChange={setRab} />
            </TabsContent>

            <TabsContent value="jadwal" className="mt-6">
              <JadwalEditor jadwal={jadwal} onChange={setJadwal} />
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- RAB tab ---------- */
function RabEditor({ rab, onChange }: { rab: Rab; onChange: (next: Rab) => void }) {
  const jumlahA = rowsTotal(rab.personil);
  const jumlahB = rowsTotal(rab.langsung);

  return (
    <div className="space-y-6">
      <RabRowsEditor
        title="A. Rincian Biaya Personil"
        rows={rab.personil}
        jumlah={jumlahA}
        jumlahLabel="Jumlah A"
        newRowSatuan="Bln"
        onChange={(personil) => onChange({ ...rab, personil })}
      />
      <RabRowsEditor
        title="B. Rincian Biaya Langsung"
        rows={rab.langsung}
        jumlah={jumlahB}
        jumlahLabel="Jumlah B"
        newRowSatuan="Ls"
        onChange={(langsung) => onChange({ ...rab, langsung })}
      />
      <div className="flex items-center justify-end gap-2 border-t border-border pt-4 text-sm">
        <span className="font-semibold">Total RAB</span>
        <span className="font-mono tabular-nums font-bold">
          {formatRupiah(jumlahA + jumlahB)}
        </span>
      </div>
    </div>
  );
}

function RabRowsEditor({
  title,
  rows,
  jumlah,
  jumlahLabel,
  newRowSatuan,
  onChange,
}: {
  title: string;
  rows: RabRow[];
  jumlah: number;
  jumlahLabel: string;
  newRowSatuan: string;
  onChange: (rows: RabRow[]) => void;
}) {
  const update = (i: number, patch: Partial<RabRow>) =>
    onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const removeRow = (i: number) => onChange(rows.filter((_, idx) => idx !== i));
  const addRow = () =>
    onChange([...rows, { uraian: "", vol: 1, satuan: newRowSatuan, hargaSatuan: 0 }]);

  return (
    <div className="space-y-3">
      <p className="font-semibold">{title}</p>
      <div className="space-y-2">
        {rows.map((row, i) => (
          <div
            key={i}
            className="flex flex-wrap items-end gap-3 rounded-md border border-border p-3"
          >
            <div className="w-3/4 min-w-[240px]">
              <label className="text-xs text-muted-foreground">Uraian</label>
              <Input
                value={row.uraian}
                onChange={(e) => update(i, { uraian: e.target.value })}
                placeholder="Uraian biaya…"
              />
            </div>
            <div className="w-20">
              <label className="text-xs text-muted-foreground">Vol</label>
              <Input
                type="number"
                min={0}
                value={row.vol}
                onChange={(e) => update(i, { vol: Number(e.target.value) })}
                className="text-right font-mono tabular-nums"
              />
            </div>
            <div className="w-20">
              <label className="text-xs text-muted-foreground">Satuan</label>
              <Input
                value={row.satuan}
                onChange={(e) => update(i, { satuan: e.target.value })}
                placeholder="Ls"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Harga Satuan</label>
              <MoneyInput
                key={i}
                defaultValue={row.hargaSatuan}
                onValueChange={(n) => update(i, { hargaSatuan: n })}
                showTerbilang={false}
                className="w-40"
              />
            </div>
            <div className="w-28 pb-2 text-right">
              <span className="text-xs text-muted-foreground">Jumlah: </span>
              <span className="font-mono tabular-nums">
                {formatRupiah((Number(row.vol) || 0) * (Number(row.hargaSatuan) || 0))}
              </span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Hapus baris"
              onClick={() => removeRow(i)}
            >
              <Trash2Icon className="size-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <Button type="button" variant="outline" size="sm" onClick={addRow}>
          <Plus className="size-4" /> Tambah Baris
        </Button>
        <div className="text-sm">
          <span className="text-muted-foreground">{jumlahLabel}: </span>
          <span className="font-mono tabular-nums font-semibold">
            {formatRupiah(jumlah)}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ---------- Estimasi Jadwal tab ---------- */
function JadwalEditor({
  jadwal,
  onChange,
}: {
  jadwal: Jadwal;
  onChange: (next: Jadwal) => void;
}) {
  const { kegiatan, highlights, bulan } = jadwal;
  const weeks = React.useMemo(
    () => Array.from({ length: bulan * 4 }, (_, i) => i + 1),
    [bulan],
  );

  const updateKegiatan = (i: number, value: string) =>
    onChange({
      ...jadwal,
      kegiatan: kegiatan.map((k, idx) => (idx === i ? value : k)),
    });

  const addKegiatan = () =>
    onChange({ ...jadwal, kegiatan: [...kegiatan, ""], highlights: [...highlights, []] });

  const removeKegiatan = (i: number) =>
    onChange({
      ...jadwal,
      kegiatan: kegiatan.filter((_, idx) => idx !== i),
      highlights: highlights.filter((_, idx) => idx !== i),
    });

  const toggleWeek = (rowIndex: number, week: number) => {
    const current = highlights[rowIndex] ?? [];
    const next = current.includes(week)
      ? current.filter((w) => w !== week)
      : [...current, week].sort((a, b) => a - b);
    onChange({
      ...jadwal,
      highlights: highlights.map((h, idx) => (idx === rowIndex ? next : h)),
    });
  };

  const setBulan = (nextBulan: number) => {
    const clamped = Math.max(1, nextBulan);
    const maxWeek = clamped * 4;
    onChange({
      ...jadwal,
      bulan: clamped,
      highlights: highlights.map((h) => h.filter((w) => w <= maxWeek)),
    });
  };

  return (
    <div className="space-y-6">
      {/* Month control */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">Jumlah Bulan:</span>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Kurangi bulan"
            disabled={bulan <= 1}
            onClick={() => setBulan(bulan - 1)}
          >
            <Minus className="size-4" />
          </Button>
          <span className="w-6 text-center font-mono tabular-nums font-semibold">
            {bulan}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Tambah bulan"
            onClick={() => setBulan(bulan + 1)}
          >
            <Plus className="size-4" />
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="border-collapse text-sm">
          <thead>
            <tr className="text-center text-xs text-muted-foreground">
              <th className="px-1 py-1 text-left font-medium">
                <span className="inline-block w-5" />
                Kegiatan
              </th>
              {Array.from({ length: bulan }, (_, m) => (
                <th key={m} colSpan={4} className="px-1 py-1 font-medium">
                  BULAN - {m + 1}
                </th>
              ))}
              <th className="px-1 py-1" />
            </tr>
            <tr className="text-center text-xs text-muted-foreground">
              <th className="px-1 py-1" />
              {weeks.map((week) => (
                <th key={week} className="w-7 px-0.5 py-1 font-normal">
                  {((week - 1) % 4) + 1}
                </th>
              ))}
              <th className="px-1 py-1" />
            </tr>
          </thead>
          <tbody>
            {kegiatan.map((nama, rowIndex) => {
              const shaded = highlights[rowIndex] ?? [];
              return (
                <tr key={rowIndex}>
                  <td className="py-1.5 pr-3">
                    <div className="flex items-center gap-1.5">
                      <span className="w-5 text-right text-xs text-muted-foreground">
                        {rowIndex + 1}
                      </span>
                      <Input
                        value={nama}
                        onChange={(e) => updateKegiatan(rowIndex, e.target.value)}
                        placeholder="Nama kegiatan…"
                        className="w-[280px]"
                      />
                    </div>
                  </td>
                  {weeks.map((week) => {
                    const on = shaded.includes(week);
                    return (
                      <td key={week} className="px-0.5 py-1 text-center">
                        <button
                          type="button"
                          aria-label={`Minggu ${week} ${on ? "aktif" : "nonaktif"}`}
                          aria-pressed={on}
                          onClick={() => toggleWeek(rowIndex, week)}
                          className={cn(
                            "size-6 rounded-sm border transition-colors",
                            on
                              ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
                              : "border-border bg-transparent hover:bg-primary/30"
                          )}
                        />
                      </td>
                    );
                  })}
                  <td className="py-1 pl-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Hapus kegiatan"
                      onClick={() => removeKegiatan(rowIndex)}
                    >
                      <Trash2Icon className="size-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Button type="button" variant="outline" size="sm" onClick={addKegiatan}>
        <Plus className="size-4" /> Tambah Kegiatan
      </Button>
    </div>
  );
}
