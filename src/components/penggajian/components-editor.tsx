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
    <div className="flex items-center gap-0.5">
      <span className="text-[10px] text-muted-foreground shrink-0">Rp</span>
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
        className="w-full rounded px-1 py-0.5 text-right text-xs font-mono bg-transparent outline-none ring-inset focus:ring-1 focus:ring-ring hover:bg-muted/50 transition-colors disabled:opacity-40"
      />
    </div>
  );
}

/** Editable list of payslip_components (allowance/deduction line items) —
 * shared between the create wizard's per-employee row and the batch/slip
 * detail views. Prefilled from `useEmployeeDefaults` but every line stays
 * editable/removable, and new lines can be added freely. */
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
    <div className="space-y-1">
      {components.map((c, i) => (
        <div key={i} className="flex items-center gap-1">
          <Input
            value={c.name} disabled={disabled}
            onChange={(e) => update(i, { name: e.target.value })}
            placeholder="Nama komponen"
            className="h-7 min-w-0 flex-1 text-xs"
          />
          <Select value={c.kind} disabled={disabled} onValueChange={(v) => update(i, { kind: v as "tunjangan" | "potongan" })}>
            <SelectTrigger className="h-7 w-28 shrink-0 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="tunjangan">Tunjangan</SelectItem>
              <SelectItem value="potongan">Potongan</SelectItem>
            </SelectContent>
          </Select>
          <div className="w-28 shrink-0">
            <InlineMoneyInput value={c.amount} disabled={disabled} onChange={(v) => update(i, { amount: v })} />
          </div>
          {c.kind === "potongan" && (
            <label className="flex shrink-0 items-center gap-1 text-[10px] text-muted-foreground" title="Porsi perusahaan — tidak mengurangi take-home">
              <Checkbox
                checked={c.isEmployerPortion} disabled={disabled}
                onCheckedChange={(v) => update(i, { isEmployerPortion: v === true })}
              />
              Perusahaan
            </label>
          )}
          {!disabled && (
            <Button type="button" variant="ghost" size="icon" className="size-6 shrink-0" onClick={() => remove(i)} aria-label="Hapus komponen">
              <X className="size-3" />
            </Button>
          )}
        </div>
      ))}
      {!disabled && (
        <Button type="button" variant="outline" size="sm" className="h-6 text-xs" onClick={add}>
          <Plus className="size-3" /> Tambah Komponen
        </Button>
      )}
      {components.length === 0 && disabled && (
        <p className="text-xs text-muted-foreground">Tidak ada komponen.</p>
      )}
    </div>
  );
}
