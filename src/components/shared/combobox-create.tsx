"use client";
import * as React from "react";
import { Check, ChevronDown, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { MultiSelectOption } from "@/components/shared/multi-select-filter";

export type ComboboxCreateProps = {
  options: MultiSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  /** Builds the "create new" row label from the typed query. */
  createLabel?: (query: string) => string;
};

/**
 * Single-select dropdown with a search box that can also create a new value on
 * the spot: when the query matches no existing option, an extra "Tambah …" row
 * (and Enter) commits the typed text as the value. Options render as colored
 * Badges when given a `variant`.
 */
export function ComboboxCreate({
  options,
  value,
  onChange,
  placeholder = "Pilih…",
  searchPlaceholder = "Cari atau ketik baru…",
  createLabel = (q) => `Tambah "${q}"`,
}: ComboboxCreateProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const q = search.trim();
  const filtered = React.useMemo(() => {
    const lq = q.toLowerCase();
    return lq ? options.filter((o) => o.label.toLowerCase().includes(lq)) : options;
  }, [options, q]);

  const exactMatch = options.some((o) => o.label.toLowerCase() === q.toLowerCase());
  const canCreate = q.length > 0 && !exactMatch;

  const selected = options.find((o) => o.value === value);
  const triggerLabel = selected?.label ?? value;

  const pick = (v: string) => { onChange(v); setOpen(false); setSearch(""); };

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setSearch(""); }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <span className={value ? "" : "text-muted-foreground"}>{value ? triggerLabel : placeholder}</span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-2" style={{ width: "var(--radix-popover-trigger-width)" }} align="start">
        <Input
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 text-sm mb-1.5"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (canCreate) pick(q);
              else if (filtered.length === 1) pick(filtered[0].value);
            }
          }}
        />
        <div
          className="max-h-[180px] overflow-y-auto overscroll-contain space-y-0.5"
          onWheel={(e) => e.stopPropagation()}
        >
          {filtered.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => pick(o.value)}
              className="flex w-full items-center justify-between gap-2 rounded px-1.5 py-1 text-left hover:bg-accent"
            >
              {o.variant ? (
                <Badge variant={o.variant} className="text-xs">{o.label}</Badge>
              ) : (
                <span className="text-sm">{o.label}</span>
              )}
              {value === o.value && <Check className="size-3.5 shrink-0 text-primary" />}
            </button>
          ))}
          {filtered.length === 0 && !canCreate && (
            <p className="px-1.5 py-1 text-xs text-muted-foreground">Tidak ditemukan.</p>
          )}
          {canCreate && (
            <button
              type="button"
              onClick={() => pick(q)}
              className="flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-left text-sm hover:bg-accent"
            >
              <Plus className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">{createLabel(q)}</span>
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
