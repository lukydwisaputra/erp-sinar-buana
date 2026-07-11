"use client";
import * as React from "react";
import { GripVertical, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// Generic drag-reorder row array editor (mirrors kelengkapan/page.tsx's
// ItemsEditor, generalized over the row shape via a render-prop) — shared by
// Milestone and Termin template step editors.
export function ArrayStepsEditor<T>({
  rows,
  onChange,
  makeEmpty,
  isEmpty,
  renderRow,
}: {
  rows: T[];
  onChange: (rows: T[]) => void;
  makeEmpty: () => T;
  isEmpty: (row: T) => boolean;
  renderRow: (row: T, index: number, update: (patch: Partial<T>) => void) => React.ReactNode;
}) {
  const [dragIdx, setDragIdx] = React.useState<number | null>(null);
  const [overIdx, setOverIdx] = React.useState<number | null>(null);

  const add = () => onChange([...rows, makeEmpty()]);
  const remove = (i: number) => onChange(rows.filter((_, idx) => idx !== i));
  const update = (i: number, patch: Partial<T>) =>
    onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const move = (from: number, to: number) => {
    if (from === to || to < 0 || to >= rows.length) return;
    const next = [...rows];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  };
  const resetDrag = () => { setDragIdx(null); setOverIdx(null); };

  return (
    <div className="space-y-2">
      {rows.map((row, i) => (
        <div
          key={i}
          onDragOver={(e) => { e.preventDefault(); if (dragIdx !== null && overIdx !== i) setOverIdx(i); }}
          onDrop={(e) => { e.preventDefault(); if (dragIdx !== null) move(dragIdx, i); resetDrag(); }}
          className={cn(
            "flex items-start gap-2 rounded-md transition-colors",
            dragIdx === i && "opacity-40",
            overIdx === i && dragIdx !== null && dragIdx !== i && "ring-1 ring-primary/50",
          )}
        >
          <span
            draggable
            onDragStart={(e) => { setDragIdx(i); e.dataTransfer.effectAllowed = "move"; }}
            onDragEnd={resetDrag}
            className="mt-2 shrink-0 cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
            aria-label="Seret untuk mengurutkan"
          >
            <GripVertical className="size-4" />
          </span>
          <span className="mt-2 w-5 shrink-0 text-xs text-muted-foreground">{i + 1}.</span>
          <div className="flex-1">{renderRow(row, i, (patch) => update(i, patch))}</div>
          <Button
            type="button" variant="ghost" size="icon" className="mt-1 size-7 shrink-0"
            onClick={() => remove(i)} disabled={rows.length <= 1 && isEmpty(row)}
          >
            <X className="size-3.5" />
          </Button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-border py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:bg-muted/40 hover:text-foreground"
      >
        <Plus className="size-3.5" /> Tambah Tahap
      </button>
    </div>
  );
}
