"use client";
import * as React from "react";
import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type MultiSelectOption = {
  value: string;
  label: string;
  /** When set, the option (and its trigger label) render as a colored Badge. */
  variant?: React.ComponentProps<typeof Badge>["variant"];
};

export type MultiSelectFilterProps = {
  options: MultiSelectOption[];
  value: string[];
  onChange: (next: string[]) => void;
  /** Trigger placeholder shown when nothing is selected. e.g. "Pilih status…" */
  placeholder?: string;
  /** Search box placeholder. e.g. "Cari status…" */
  searchPlaceholder?: string;
  /** Noun for the "{n} {noun} dipilih" trigger label. e.g. "status", "kategori". */
  noun?: string;
};

/**
 * Searchable multi-select dropdown used by list-page filter dialogs.
 *
 * Trigger shows: placeholder (none) → single option label (one) → "N noun
 * dipilih" (many). Options render as Badges when given a `variant`, else plain
 * text. Mirrors the original penawaran StatusMultiSelect so all filters match.
 */
export function MultiSelectFilter({
  options,
  value,
  onChange,
  placeholder = "Pilih…",
  searchPlaceholder = "Cari…",
  noun = "item",
}: MultiSelectFilterProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  }, [options, search]);

  const toggle = (v: string) =>
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);

  const triggerLabel =
    value.length === 0
      ? placeholder
      : value.length === 1
        ? (options.find((o) => o.value === value[0])?.label ?? value[0])
        : `${value.length} ${noun} dipilih`;

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setSearch(""); }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <span className={value.length === 0 ? "text-muted-foreground" : ""}>{triggerLabel}</span>
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
        />
        <div
          className="max-h-[160px] overflow-y-auto overscroll-contain space-y-0.5"
          onWheel={(e) => e.stopPropagation()}
        >
          {filtered.map((o) => (
            <label key={o.value} className="flex cursor-pointer items-center gap-2.5 rounded px-1.5 py-1 hover:bg-accent">
              <Checkbox checked={value.includes(o.value)} onCheckedChange={() => toggle(o.value)} />
              {o.variant ? (
                <Badge variant={o.variant} className="text-xs">{o.label}</Badge>
              ) : (
                <span className="text-sm">{o.label}</span>
              )}
            </label>
          ))}
          {filtered.length === 0 && (
            <p className="px-1.5 py-1 text-xs text-muted-foreground">Tidak ditemukan.</p>
          )}
        </div>
        {value.length > 0 && (
          <div className="mt-1.5 border-t pt-1.5">
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={() => onChange([])}
            >
              Hapus semua
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
