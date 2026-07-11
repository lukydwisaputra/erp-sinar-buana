"use client";

import { Trash2Icon } from "lucide-react";

import type { SphFormValues } from "@/lib/schemas/penawaran";
import { terminPersenTotal, isTerminValid } from "@/lib/sph";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle } from "@/components/ui/alert";

/* ---------- 3. Skema Termin ---------- */
export function TerminEditor({
  termin,
  onChange,
}: {
  termin: SphFormValues["termin"];
  onChange: (v: SphFormValues["termin"]) => void;
}) {
  const update = (i: number, patch: Partial<SphFormValues["termin"][number]>) =>
    onChange(termin.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));
  const removeRow = (i: number) => onChange(termin.filter((_, idx) => idx !== i));
  const addRow = () =>
    onChange([...termin, { label: `Termin ${termin.length + 1}`, persen: 0, pemicu: "" }]);

  const total = terminPersenTotal(termin);
  const valid = isTerminValid(termin);

  return (
    <div className="space-y-3">
      {termin.map((t, i) => (
        <div key={i} className="flex flex-wrap items-end gap-2 rounded-md border border-border p-3">
          <div className="min-w-32 flex-1">
            <label className="text-xs text-muted-foreground">Label</label>
            <Input value={t.label} onChange={(e) => update(i, { label: e.target.value })} />
          </div>
          <div className="w-24">
            <label className="text-xs text-muted-foreground">Persen (%)</label>
            <Input
              type="number"
              value={t.persen ? String(t.persen) : ""}
              onChange={(e) => {
                const entered = Math.max(0, Number(e.target.value) || 0);
                const othersTotal = termin.reduce(
                  (s, x, idx) => (idx === i ? s : s + (Number(x.persen) || 0)),
                  0,
                );
                const max = Math.max(0, 100 - othersTotal);
                update(i, { persen: Math.min(entered, max) });
              }}
              placeholder="100"
              className="text-right font-mono tabular-nums"
            />
          </div>
          <div className="min-w-40 flex-1">
            <label className="text-xs text-muted-foreground">Pemicu</label>
            <Input
              value={t.pemicu}
              onChange={(e) => update(i, { pemicu: e.target.value })}
              placeholder="Pelunasan"
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Hapus termin"
            onClick={() => removeRow(i)}
          >
            <Trash2Icon className="size-4 text-destructive" />
          </Button>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addRow}
        disabled={total >= 100}
      >
        Tambah Termin
      </Button>

      <p className="text-sm">
        <span className="text-muted-foreground">Σ% = </span>
        <span className="font-mono tabular-nums font-semibold">{total}%</span>
      </p>

      {!valid && (
        <Alert variant="destructive">
          <AlertTitle>Total persentase termin harus 100%.</AlertTitle>
        </Alert>
      )}
    </div>
  );
}
