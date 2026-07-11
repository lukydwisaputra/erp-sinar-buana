"use client";

import * as React from "react";
import { Plus, X, Pencil, GripVertical } from "lucide-react";

import type { SphKelengkapan } from "@/lib/schemas/penawaran";
import { useKelengkapanList } from "@/lib/query/kelengkapan";
import { BuilderSection } from "@/components/shared/builder-layout";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

/* ---------- Kelengkapan Administrasi ---------- */
type ItemPatch = Partial<{ persyaratan: string; status: "ada" | "tidak" | ""; keterangan: string }>;

export function KelengkapanSection({
  kelengkapan,
  onChange,
}: {
  kelengkapan: SphKelengkapan[];
  onChange: (v: SphKelengkapan[]) => void;
}) {
  const { data: templates = [] } = useKelengkapanList();
  const [popoverOpen, setPopoverOpen] = React.useState(false);
  const [editingIdx, setEditingIdx] = React.useState<number | null>(null);
  const [nameDraft, setNameDraft] = React.useState("");
  const dragSrc = React.useRef<number | null>(null);

  const addTemplate = (t: (typeof templates)[0]) => {
    if (kelengkapan.some((k) => k.templateId === t.id)) return;
    const next = [
      ...kelengkapan,
      { templateId: t.id, nama: t.nama, items: t.items.map((it) => ({ ...it, status: "" as const, keterangan: "" })) },
    ];
    onChange(next);
    setPopoverOpen(false);
    setEditingIdx(next.length - 1);
  };

  const removeTemplate = (i: number) => {
    onChange(kelengkapan.filter((_, idx) => idx !== i));
    if (editingIdx === i) setEditingIdx(null);
  };

  const updateItem = (ki: number, ii: number, patch: ItemPatch) =>
    onChange(kelengkapan.map((k, idx) =>
      idx !== ki ? k : { ...k, items: k.items.map((it, iidx) => iidx !== ii ? it : { ...it, ...patch }) }
    ));

  const addItem = (ki: number) =>
    onChange(kelengkapan.map((k, idx) =>
      idx !== ki ? k : { ...k, items: [...k.items, { persyaratan: "", status: "" as const, keterangan: "" }] }
    ));

  const removeItem = (ki: number, ii: number) =>
    onChange(kelengkapan.map((k, idx) =>
      idx !== ki ? k : { ...k, items: k.items.filter((_, iidx) => iidx !== ii) }
    ));

  const reorderItem = (ki: number, from: number, to: number) => {
    if (from === to) return;
    onChange(kelengkapan.map((k, idx) => {
      if (idx !== ki) return k;
      const items = [...k.items];
      const [moved] = items.splice(from, 1);
      items.splice(to, 0, moved);
      return { ...k, items };
    }));
  };

  const commitName = () => {
    if (editingIdx === null) return;
    const trimmed = nameDraft.trim();
    if (trimmed) onChange(kelengkapan.map((k, idx) => idx !== editingIdx ? k : { ...k, nama: trimmed }));
  };

  const available = templates.filter((t) => !kelengkapan.some((k) => k.templateId === t.id));
  const editing = editingIdx !== null ? kelengkapan[editingIdx] : null;

  return (
    <BuilderSection title="Kelengkapan Administrasi">
      <div className="space-y-2">
        {kelengkapan.length === 0 && (
          <p className="text-sm text-muted-foreground">Belum ada template kelengkapan disematkan.</p>
        )}

        {kelengkapan.map((k, ki) => (
          <div key={ki} className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2">
            <span className="flex-1 text-sm font-medium">{k.nama}</span>
            <span className="text-xs text-muted-foreground">{k.items.length} item</span>
            <Button type="button" variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={() => setEditingIdx(ki)}>
              <Pencil className="size-3" /> Edit
            </Button>
            <button
              type="button"
              onClick={() => removeTemplate(ki)}
              className="rounded p-0.5 text-muted-foreground hover:text-destructive"
            >
              <X className="size-4" />
            </button>
          </div>
        ))}

        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="w-full" disabled={available.length === 0}>
              <Plus className="size-3.5" />
              {available.length === 0 ? "Semua template sudah disematkan" : "Sematkan Template"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="start">
            <Command>
              <CommandInput placeholder="Cari template…" />
              <CommandList>
                <CommandEmpty>Tidak ada template.</CommandEmpty>
                <CommandGroup>
                  {available.map((t) => (
                    <CommandItem key={t.id} onSelect={() => addTemplate(t)}>
                      <div>
                        <p className="text-sm font-medium">{t.nama}</p>
                        <p className="text-xs text-muted-foreground">{t.items.length} persyaratan</p>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Edit modal */}
      <Dialog
        open={editingIdx !== null}
        onOpenChange={(o) => { if (!o) setEditingIdx(null); }}
      >
        <DialogContent
          className="flex h-[80vh] w-[80vw] max-w-[80vw]! flex-col gap-0 p-0"
          showCloseButton={false}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogHeader className="shrink-0 border-b px-6 py-4">
            <div className="flex items-center gap-3">
              <DialogTitle className="flex-1">
                <input
                  key={editingIdx}
                  defaultValue={editing?.nama ?? ""}
                  onFocus={(e) => { setNameDraft(e.target.value); e.target.select(); }}
                  onChange={(e) => setNameDraft(e.target.value)}
                  onBlur={commitName}
                  onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
                  className="w-full bg-transparent text-xl font-semibold outline-none placeholder:text-muted-foreground hover:bg-muted/40 focus:rounded focus:bg-muted/40 focus:px-1"
                />
              </DialogTitle>
              <button
                type="button"
                onClick={() => setEditingIdx(null)}
                className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            {/* Column headers */}
            <div className="mb-2 grid grid-cols-[1.25rem_1.5rem_1fr_5rem_5rem_11rem_2rem] gap-2 text-xs font-medium text-muted-foreground">
              <span />
              <span />
              <span>Persyaratan</span>
              <span className="text-center">Ada</span>
              <span className="text-center">Tidak</span>
              <span>Keterangan</span>
              <span />
            </div>

            <ol className="space-y-1.5">
              {editing?.items.map((it, ii) => (
                <li
                  key={ii}
                  draggable
                  onDragStart={() => { dragSrc.current = ii; }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => { if (dragSrc.current !== null) reorderItem(editingIdx!, dragSrc.current, ii); dragSrc.current = null; }}
                  onDragEnd={() => { dragSrc.current = null; }}
                  className="grid grid-cols-[1.25rem_1.5rem_1fr_5rem_5rem_11rem_2rem] items-center gap-2"
                >
                  <GripVertical className="size-4 cursor-grab text-muted-foreground/50 active:cursor-grabbing" />
                  <span className="text-xs text-muted-foreground">{String.fromCharCode(97 + ii)}.</span>
                  <Input
                    value={it.persyaratan}
                    onChange={(e) => updateItem(editingIdx!, ii, { persyaratan: e.target.value })}
                    placeholder="Uraian persyaratan…"
                    className="h-7 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => updateItem(editingIdx!, ii, { status: it.status === "ada" ? "" : "ada" })}
                    className={`flex h-7 w-full items-center justify-center rounded border text-xs font-semibold transition-colors ${it.status === "ada" ? "border-green-600 bg-green-50 text-green-700" : "border-border text-muted-foreground hover:border-green-400"}`}
                  >
                    {it.status === "ada" ? "✓ Ada" : "Ada"}
                  </button>
                  <button
                    type="button"
                    onClick={() => updateItem(editingIdx!, ii, { status: it.status === "tidak" ? "" : "tidak" })}
                    className={`flex h-7 w-full items-center justify-center rounded border text-xs font-semibold transition-colors ${it.status === "tidak" ? "border-red-500 bg-red-50 text-red-600" : "border-border text-muted-foreground hover:border-red-400"}`}
                  >
                    {it.status === "tidak" ? "✗ Tidak" : "Tidak"}
                  </button>
                  <Input
                    value={it.keterangan}
                    onChange={(e) => updateItem(editingIdx!, ii, { keterangan: e.target.value })}
                    placeholder="Keterangan…"
                    className="h-7 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(editingIdx!, ii)}
                    className="flex size-6 items-center justify-center rounded text-muted-foreground hover:text-destructive"
                  >
                    <X className="size-3.5" />
                  </button>
                </li>
              ))}
            </ol>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3 w-full"
              onClick={() => addItem(editingIdx!)}
            >
              <Plus className="size-3.5" /> Tambah Persyaratan
            </Button>
          </div>

          <DialogFooter className="shrink-0 rounded-b-xl border-t px-6 pb-6 pt-4">
            <Button type="button" onClick={() => setEditingIdx(null)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </BuilderSection>
  );
}
