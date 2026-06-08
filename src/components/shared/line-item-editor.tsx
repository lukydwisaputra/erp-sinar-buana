"use client";
import * as React from "react";
import { Trash2Icon, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/shared/money-input";
import { formatRupiah } from "@/lib/format";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type ServiceOption = { id: string; nama: string; harga: number };
export type LineItem = { layananId: string; nama: string; volume: number; harga: number };

export function LineItemEditor({ items, options, onChange }: {
  items: LineItem[]; options: ServiceOption[]; onChange: (items: LineItem[]) => void;
}) {
  const update = (i: number, patch: Partial<LineItem>) =>
    onChange(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const removeRow = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const addRow = () => onChange([...items, { layananId: "", nama: "", volume: 1, harga: 0 }]);

  return (
    <div className="space-y-3">
      {items.map((it, i) => (
        <div key={i} className="space-y-2 rounded-md border border-border p-3">
          <ServicePicker value={it} options={options}
            onPick={(opt) => update(i, { layananId: opt.id, nama: opt.nama, harga: opt.harga })} />
          <div className="flex flex-wrap items-end gap-2">
            <div className="w-20">
              <label className="text-xs text-muted-foreground">Volume</label>
              <Input type="number" min={1} value={it.volume}
                onChange={(e) => update(i, { volume: Number(e.target.value) })} className="text-right font-mono tabular-nums" />
            </div>
            <div className="w-44">
              <label className="text-xs text-muted-foreground">Harga Satuan</label>
              <MoneyInput defaultValue={it.harga} onValueChange={(n) => update(i, { harga: n })} />
            </div>
            <Button type="button" variant="ghost" size="icon" aria-label="Hapus baris" onClick={() => removeRow(i)}>
              <Trash2Icon className="size-4 text-destructive" />
            </Button>
            <div className="ml-auto text-right text-sm">
              <span className="text-muted-foreground">Jumlah: </span>
              <span className="font-mono tabular-nums">{formatRupiah(it.volume * it.harga)}</span>
            </div>
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addRow}><Plus className="size-4" /> Tambah Baris</Button>
    </div>
  );
}

function ServicePicker({ value, options, onPick }: {
  value: LineItem; options: ServiceOption[]; onPick: (o: ServiceOption) => void;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <div>
      <label className="text-xs text-muted-foreground">Layanan</label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" role="combobox"
            className={cn("w-full justify-between font-normal", !value.layananId && "text-muted-foreground")}>
            {value.nama || "Pilih layanan…"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
          <Command>
            <CommandInput placeholder="Cari layanan…" />
            <CommandList>
              <CommandEmpty>Tidak ada layanan.</CommandEmpty>
              <CommandGroup>
                {options.map((o) => (
                  <CommandItem key={o.id} value={o.nama} onSelect={() => { onPick(o); setOpen(false); }}>
                    {o.nama}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
