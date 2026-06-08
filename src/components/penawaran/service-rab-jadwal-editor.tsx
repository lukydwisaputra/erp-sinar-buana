"use client";

import * as React from "react";
import { Trash2Icon, Plus } from "lucide-react";

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
type Jadwal = { kegiatan: string[]; highlights: number[][] };

const WEEKS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Kelola RAB &amp; Jadwal — {serviceName || "Layanan"}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="rab" className="mt-2">
          <TabsList>
            <TabsTrigger value="rab">RAB</TabsTrigger>
            <TabsTrigger value="jadwal">Estimasi Jadwal</TabsTrigger>
          </TabsList>

          <TabsContent value="rab">
            <RabEditor rab={rab} onChange={setRab} />
          </TabsContent>

          <TabsContent value="jadwal">
            <JadwalEditor jadwal={jadwal} onChange={setJadwal} />
          </TabsContent>
        </Tabs>
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
      <div className="flex items-center justify-end gap-2 border-t border-border pt-3 text-sm">
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
    <div className="space-y-2">
      <p className="font-semibold">{title}</p>
      <div className="space-y-2">
        {rows.map((row, i) => (
          <div
            key={i}
            className="flex flex-wrap items-end gap-2 rounded-md border border-border p-2"
          >
            <div className="min-w-40 flex-1">
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
              />
            </div>
            <div className="w-36 pb-2 text-right">
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
  const { kegiatan, highlights } = jadwal;

  const updateKegiatan = (i: number, value: string) =>
    onChange({
      kegiatan: kegiatan.map((k, idx) => (idx === i ? value : k)),
      highlights,
    });

  const addKegiatan = () =>
    onChange({ kegiatan: [...kegiatan, ""], highlights: [...highlights, []] });

  const removeKegiatan = (i: number) =>
    onChange({
      kegiatan: kegiatan.filter((_, idx) => idx !== i),
      highlights: highlights.filter((_, idx) => idx !== i),
    });

  const toggleWeek = (rowIndex: number, week: number) => {
    const current = highlights[rowIndex] ?? [];
    const next = current.includes(week)
      ? current.filter((w) => w !== week)
      : [...current, week].sort((a, b) => a - b);
    onChange({
      kegiatan,
      highlights: highlights.map((h, idx) => (idx === rowIndex ? next : h)),
    });
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Atur kegiatan dan arsiran minggu (Bulan-1/2/3 × Minggu 1-4).
      </p>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="text-center text-xs text-muted-foreground">
              <th className="px-1 py-1 text-left font-medium">Kegiatan</th>
              {[1, 2, 3].map((bulan) => (
                <th key={bulan} colSpan={4} className="px-1 py-1 font-medium">
                  Bulan-{bulan}
                </th>
              ))}
              <th className="px-1 py-1" />
            </tr>
            <tr className="text-center text-xs text-muted-foreground">
              <th className="px-1 py-1" />
              {[1, 2, 3, 4, 1, 2, 3, 4, 1, 2, 3, 4].map((w, i) => (
                <th key={i} className="w-7 px-0.5 py-1 font-normal">
                  {w}
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
                  <td className="py-1 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="w-5 text-right text-xs text-muted-foreground">
                        {rowIndex + 1}
                      </span>
                      <Input
                        value={nama}
                        onChange={(e) => updateKegiatan(rowIndex, e.target.value)}
                        placeholder="Nama kegiatan…"
                        className="min-w-48"
                      />
                    </div>
                  </td>
                  {WEEKS.map((week) => {
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
                              ? "border-primary bg-primary"
                              : "border-border bg-transparent hover:bg-muted"
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
