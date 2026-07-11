"use client";

import type { UseFormReturn } from "react-hook-form";
import { Trash2Icon } from "lucide-react";

import type { SphFormValues } from "@/lib/schemas/penawaran";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

/* ---------- Masa Berlaku (day-count) ---------- */
export function MasaBerlakuField({ form }: { form: UseFormReturn<SphFormValues> }) {
  const masaBerlakuAktif = form.watch("masaBerlakuAktif");
  const masaBerlakuHari = form.watch("masaBerlakuHari");

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
      <label className="flex items-center gap-2">
        <Checkbox
          checked={masaBerlakuAktif}
          onCheckedChange={(c) => form.setValue("masaBerlakuAktif", c === true)}
        />
        Masa Berlaku
      </label>
      {masaBerlakuAktif && (
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={1}
            value={masaBerlakuHari ? String(masaBerlakuHari) : ""}
            onChange={(e) =>
              form.setValue("masaBerlakuHari", Number(e.target.value) || 0, {
                shouldValidate: true,
              })
            }
            placeholder="30"
            className="w-24 text-right font-mono tabular-nums"
          />
          <span className="text-muted-foreground">hari kalender</span>
        </div>
      )}
    </div>
  );
}

/* ---------- Catatan (editable bullet list) ---------- */
export function CatatanEditor({
  catatan,
  onChange,
}: {
  catatan: string[];
  onChange: (v: string[]) => void;
}) {
  const update = (i: number, value: string) =>
    onChange(catatan.map((c, idx) => (idx === i ? value : c)));
  const removeRow = (i: number) => onChange(catatan.filter((_, idx) => idx !== i));
  const addRow = () => onChange([...catatan, ""]);

  return (
    <div className="space-y-3">
      {catatan.map((c, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-muted-foreground">•</span>
          <Input
            value={c}
            onChange={(e) => update(i, e.target.value)}
            placeholder="Tulis catatan…"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Hapus catatan"
            onClick={() => removeRow(i)}
          >
            <Trash2Icon className="size-4 text-destructive" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addRow}>
        Tambah Catatan
      </Button>
    </div>
  );
}

/* ---------- Pajak Row ---------- */
export function PajakRow({
  label,
  aktif,
  persen,
  onToggle,
  onPersen,
}: {
  label: string;
  aktif: boolean;
  persen: number;
  onToggle: (v: boolean) => void;
  onPersen: (v: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
      <label className="flex w-32 items-center gap-2">
        <Checkbox checked={aktif} onCheckedChange={(c) => onToggle(c === true)} />
        {label}
      </label>
      {aktif && (
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={0}
            max={100}
            value={persen ? String(persen) : ""}
            onChange={(e) => onPersen(Number(e.target.value) || 0)}
            className="w-20 text-right font-mono tabular-nums"
          />
          <span className="text-muted-foreground">%</span>
        </div>
      )}
    </div>
  );
}
