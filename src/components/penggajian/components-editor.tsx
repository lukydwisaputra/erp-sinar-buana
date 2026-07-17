"use client";
import * as React from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { formatIntIDR, parseRupiah } from "@/lib/format";
import type { CreateComponentInput } from "@/lib/schemas/penggajian";

function InlineMoneyInput({ value, disabled, onChange }: { value: number; disabled?: boolean; onChange: (v: number) => void }) {
  const [focused, setFocused] = React.useState(false);
  const [text, setText] = React.useState(value ? formatIntIDR(value) : "");
  React.useEffect(() => { if (!focused) setText(value ? formatIntIDR(value) : ""); }, [value, focused]);
  return (
    <div className="flex items-center gap-1 rounded-md border border-input bg-transparent px-2 h-9 focus-within:ring-1 focus-within:ring-ring">
      <span className="text-xs text-muted-foreground shrink-0">Rp</span>
      <input
        inputMode="numeric" disabled={disabled}
        value={focused ? text : (value ? formatIntIDR(value) : "")}
        placeholder="0"
        onFocus={() => setFocused(true)}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          setFocused(false);
          const v = parseRupiah(text);
          setText(v ? formatIntIDR(v) : "");
          if (v !== value) onChange(v);
        }}
        className="w-full min-w-0 text-right text-sm font-mono bg-transparent outline-none disabled:opacity-40"
      />
    </div>
  );
}

/** Editable list of payslip_components (allowance/deduction line items) —
 * shared between the create wizard's per-employee row and the batch/slip
 * detail views. Prefilled from `useEmployeeDefaults` but every line stays
 * editable/removable, and new lines can be added freely.
 *
 * Column widths are fixed (grid, not flex-with-conditional-child) so
 * tunjangan and potongan rows line up — the "Porsi Perusahaan" cell always
 * reserves its space, showing a "–" placeholder for tunjangan rows instead
 * of omitting the cell, which used to make rows visually uneven. */
const GRID_COLS = "grid-cols-[1fr_140px_160px_140px_36px]";

export function ComponentsEditor({
  components, onChange, disabled,
}: {
  components: CreateComponentInput[];
  onChange: (next: CreateComponentInput[]) => void;
  disabled?: boolean;
}) {
  const update = (i: number, patch: Partial<CreateComponentInput>) =>
    onChange(components.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  const remove = (i: number) => onChange(components.filter((_, idx) => idx !== i));
  const add = () => onChange([...components, { name: "", kind: "tunjangan", amount: 0, isEmployerPortion: false }]);

  return (
    <div className="space-y-2">
      {components.length > 0 && (
        <div className={`grid ${GRID_COLS} gap-2 px-1 text-xs font-medium text-muted-foreground`}>
          <span>Nama Komponen</span>
          <span>Jenis</span>
          <span>Jumlah</span>
          <span title="Porsi perusahaan tidak mengurangi take-home karyawan (mis. BPJS bagian perusahaan)">Porsi Perusahaan</span>
          <span />
        </div>
      )}
      <div className="space-y-1.5">
        {components.map((c, i) => (
          <div key={i} className={`grid ${GRID_COLS} items-center gap-2 rounded-md border border-transparent px-1 py-0.5 hover:border-border`}>
            <Input
              value={c.name} disabled={disabled}
              onChange={(e) => update(i, { name: e.target.value })}
              placeholder="Nama komponen"
              className="h-9 min-w-0 text-sm"
            />
            <Select value={c.kind} disabled={disabled} onValueChange={(v) => update(i, { kind: v as "tunjangan" | "potongan" })}>
              <SelectTrigger className="h-9 w-full text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="tunjangan">Tunjangan</SelectItem>
                <SelectItem value="potongan">Potongan</SelectItem>
              </SelectContent>
            </Select>
            <InlineMoneyInput value={c.amount} disabled={disabled} onChange={(v) => update(i, { amount: v })} />
            {c.kind === "potongan" ? (
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <Checkbox
                  checked={c.isEmployerPortion} disabled={disabled}
                  onCheckedChange={(v) => update(i, { isEmployerPortion: v === true })}
                />
                Perusahaan
              </label>
            ) : (
              <span className="text-sm text-muted-foreground/50">—</span>
            )}
            {!disabled ? (
              <Button type="button" variant="ghost" size="icon" className="size-8 justify-self-center" onClick={() => remove(i)} aria-label="Hapus komponen">
                <X className="size-4" />
              </Button>
            ) : <span />}
          </div>
        ))}
      </div>
      {!disabled && (
        <Button type="button" variant="outline" size="sm" onClick={add}>
          <Plus className="size-3.5" /> Tambah Komponen
        </Button>
      )}
      {components.length === 0 && disabled && (
        <p className="text-sm text-muted-foreground">Tidak ada komponen.</p>
      )}
    </div>
  );
}
