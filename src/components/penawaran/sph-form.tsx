"use client";

import * as React from "react";
import type { UseFormReturn } from "react-hook-form";
import { Trash2Icon, CalendarIcon, SlidersHorizontal, Plus, X, Pencil, GripVertical } from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

import type { SphFormValues, SphKelengkapan } from "@/lib/schemas/penawaran";
import { useKelengkapanList } from "@/lib/query/kelengkapan";
import type { PIC } from "@/lib/schemas/perusahaan";
import { BuilderSection } from "@/components/shared/builder-layout";
import { LineItemEditor, type ServiceOption } from "@/components/shared/line-item-editor";
import { ServiceRabJadwalEditor } from "@/components/penawaran/service-rab-jadwal-editor";
import { totalPenawaran, terminPersenTotal, isTerminValid } from "@/lib/sph";
import { formatRupiah } from "@/lib/format";
import { terbilang } from "@/lib/terbilang";
import { cn } from "@/lib/utils";

import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
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

export type PerusahaanOption = { id: string; nama: string; alamat: string; pic: PIC[] };
export type LayananOption = { id: string; nama: string; harga: number };

const err = (e: { message?: string } | undefined) => (e ? [e] : undefined);

export function SphForm({
  form,
  perusahaanOptions,
  layananOptions,
}: {
  form: UseFormReturn<SphFormValues>;
  perusahaanOptions: PerusahaanOption[];
  layananOptions: LayananOption[];
}): React.JSX.Element {
  const values = form.watch();

  return (
    <div className="space-y-6">
      <TujuanSection form={form} perusahaanOptions={perusahaanOptions} />

      <BuilderSection title="Naskah Dokumen">
        <Field>
          <FieldLabel>Kalimat Pembuka</FieldLabel>
          <Textarea
            rows={3}
            placeholder="Sehubungan dengan adanya permintaan untuk…"
            {...form.register("kalimatPembuka")}
          />
        </Field>
      </BuilderSection>

      <BuilderSection title="Baris Layanan">
        <label className="mb-4 flex items-center gap-2 border-b border-border pb-4 text-sm">
          <Checkbox
            checked={values.rincianAktif}
            onCheckedChange={(c) => form.setValue("rincianAktif", c === true)}
          />
          Kelola RAB &amp; Estimasi Waktu (sertakan sebagai lampiran)
        </label>

        <LineItemEditor
          items={values.items}
          options={layananOptions as ServiceOption[]}
          onChange={(v) => form.setValue("items", v, { shouldValidate: true })}
          renderRowExtra={
            values.rincianAktif
              ? (it, i, update) => (
                  <ServiceRabJadwalEditor
                    serviceName={it.nama}
                    rab={it.rab}
                    jadwal={it.jadwal}
                    previous={
                      i > 0
                        ? { rab: values.items[i - 1].rab, jadwal: values.items[i - 1].jadwal }
                        : undefined
                    }
                    onChange={(patch) => update(i, patch)}
                    trigger={
                      <Button type="button" variant="outline" size="sm">
                        <SlidersHorizontal className="size-4" /> RAB &amp; Jadwal
                      </Button>
                    }
                  />
                )
              : undefined
          }
        />

        <div className="mt-3 text-right">
          <div className="text-sm">
            <span className="text-muted-foreground">Total Penawaran: </span>
            <span className="font-mono tabular-nums font-semibold">
              {formatRupiah(totalPenawaran(values.items))}
            </span>
          </div>
          <p className="text-xs capitalize italic text-muted-foreground">
            {totalPenawaran(values.items)
              ? `${terbilang(totalPenawaran(values.items))} rupiah`
              : "—"}
          </p>
        </div>
        <FieldError className="mt-2" errors={err(form.formState.errors.items)} />
      </BuilderSection>

      <KelengkapanSection
        kelengkapan={values.kelengkapan ?? []}
        onChange={(v) => form.setValue("kelengkapan", v)}
      />

      <BuilderSection title="Catatan & Ketentuan">
        <div className="space-y-4">
          <MasaBerlakuField form={form} />
          <CatatanEditor
            catatan={values.catatan}
            onChange={(v) => form.setValue("catatan", v, { shouldValidate: true })}
          />
        </div>
      </BuilderSection>

      <BuilderSection title="Skema Termin">
        <TerminEditor
          termin={values.termin}
          onChange={(v) => form.setValue("termin", v, { shouldValidate: true })}
        />
      </BuilderSection>

      <BuilderSection title="Pajak">
        <div className="space-y-3">
          <PajakRow
            label="PPN"
            aktif={values.ppnAktif}
            persen={values.ppnPersen}
            onToggle={(c) => form.setValue("ppnAktif", c)}
            onPersen={(n) => form.setValue("ppnPersen", n)}
          />
          <PajakRow
            label="PPh 23"
            aktif={values.pph23Aktif}
            persen={values.pph23Persen}
            onToggle={(c) => form.setValue("pph23Aktif", c)}
            onPersen={(n) => form.setValue("pph23Persen", n)}
          />
        </div>
      </BuilderSection>
    </div>
  );
}

/* ---------- Kelengkapan Administrasi ---------- */
type ItemPatch = Partial<{ persyaratan: string; status: "ada" | "tidak" | ""; keterangan: string }>;

function KelengkapanSection({
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

/* ---------- Masa Berlaku (day-count) ---------- */
function MasaBerlakuField({ form }: { form: UseFormReturn<SphFormValues> }) {
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
function CatatanEditor({
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

/* ---------- 1. Tujuan Penawaran ---------- */
function TujuanSection({
  form,
  perusahaanOptions,
}: {
  form: UseFormReturn<SphFormValues>;
  perusahaanOptions: PerusahaanOption[];
}) {
  const perusahaanId = form.watch("perusahaanId");
  const tanggal = form.watch("tanggal");
  const picAktif = form.watch("picAktif");
  const picNama = form.watch("picNama");
  const selected = perusahaanOptions.find((p) => p.id === perusahaanId);
  const errors = form.formState.errors;

  const [tglOpen, setTglOpen] = React.useState(false);
  // Parse stored yyyy-MM-dd as LOCAL midnight to avoid the UTC off-by-one shift.
  const tglDate = tanggal ? new Date(tanggal + "T00:00:00") : undefined;

  return (
    <BuilderSection title="Tujuan Penawaran">
      <div className="space-y-4">
        <Field data-invalid={!!errors.perusahaanId}>
          <FieldLabel>Perusahaan</FieldLabel>
          <PerusahaanPicker
            value={selected}
            options={perusahaanOptions}
            onPick={(opt) => {
              form.setValue("perusahaanId", opt.id, { shouldValidate: true });
              form.setValue("perusahaanNama", opt.nama);
              form.setValue("alamat", opt.alamat);
              form.setValue("picAktif", false);
              form.setValue("picNama", "");
              form.setValue("picJabatan", "");
            }}
          />
          <FieldError errors={err(errors.perusahaanId)} />
        </Field>

        {selected && selected.pic.length > 0 && (
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={picAktif}
                onCheckedChange={(c) => {
                  form.setValue("picAktif", c === true);
                  if (!(c === true)) { form.setValue("picNama", ""); form.setValue("picJabatan", ""); }
                }}
              />
              Cantumkan nama PIC
            </label>
            {picAktif && (
              <PicPicker
                options={selected.pic}
                selectedNama={picNama}
                onPick={(p) => { form.setValue("picNama", p.nama); form.setValue("picJabatan", p.jabatan); }}
              />
            )}
          </div>
        )}

        {!picAktif && (
          <Field>
            <FieldLabel>Jabatan Penerima</FieldLabel>
            <Input {...form.register("jabatanPenerima")} placeholder="Direktur" />
          </Field>
        )}

        <Field data-invalid={!!errors.tanggal} className="w-56">
          <FieldLabel>Tanggal</FieldLabel>
          <Popover open={tglOpen} onOpenChange={setTglOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className={cn(
                  "w-full justify-start font-normal",
                  !tglDate && "text-muted-foreground"
                )}
                aria-invalid={!!errors.tanggal}
              >
                <CalendarIcon />
                {tglDate ? format(tglDate, "dd MMMM yyyy", { locale: idLocale }) : "Pilih tanggal"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={tglDate}
                onSelect={(d) => {
                  form.setValue("tanggal", d ? format(d, "yyyy-MM-dd") : "", {
                    shouldValidate: true,
                  });
                  setTglOpen(false);
                }}
                locale={idLocale}
                autoFocus
              />
            </PopoverContent>
          </Popover>
          <FieldError errors={err(errors.tanggal)} />
        </Field>

        <Field>
          <FieldLabel>Lampiran</FieldLabel>
          <Input {...form.register("lampiran")} placeholder="Dokumen pendukung" />
        </Field>
      </div>
    </BuilderSection>
  );
}

function PerusahaanPicker({
  value,
  options,
  onPick,
}: {
  value: PerusahaanOption | undefined;
  options: PerusahaanOption[];
  onPick: (o: PerusahaanOption) => void;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          className={cn("w-full justify-between font-normal", !value && "text-muted-foreground")}
        >
          {value?.nama || "Pilih perusahaan…"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
        <Command>
          <CommandInput placeholder="Cari perusahaan…" />
          <CommandList>
            <CommandEmpty>Tidak ada perusahaan.</CommandEmpty>
            <CommandGroup>
              {options.map((o) => (
                <CommandItem
                  key={o.id}
                  value={o.nama}
                  onSelect={() => {
                    onPick(o);
                    setOpen(false);
                  }}
                >
                  {o.nama}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function PicPicker({
  options,
  selectedNama,
  onPick,
}: {
  options: PIC[];
  selectedNama: string;
  onPick: (p: PIC) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const selected = options.find((p) => p.nama === selectedNama);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          className={cn("w-full justify-between font-normal", !selected && "text-muted-foreground")}
        >
          {selected ? `${selected.nama} — ${selected.jabatan}` : "Pilih PIC…"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
        <Command>
          <CommandInput placeholder="Cari PIC…" />
          <CommandList>
            <CommandEmpty>Tidak ada PIC.</CommandEmpty>
            <CommandGroup>
              {options.map((p) => (
                <CommandItem
                  key={p.nama}
                  value={p.nama}
                  onSelect={() => { onPick(p); setOpen(false); }}
                >
                  <div>
                    <p>{p.nama}</p>
                    <p className="text-xs text-muted-foreground">{p.jabatan}</p>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/* ---------- 3. Skema Termin ---------- */
function TerminEditor({
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

/* ---------- Pajak Row ---------- */
function PajakRow({
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
