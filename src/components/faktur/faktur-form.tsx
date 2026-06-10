"use client";
import * as React from "react";
import type { UseFormReturn } from "react-hook-form";
import { Trash2Icon, CalendarIcon, Plus } from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

import type { FakturFormValues } from "@/lib/schemas/faktur";
import { BuilderSection } from "@/components/shared/builder-layout";
import { MoneyInput } from "@/components/shared/money-input";
import { cn } from "@/lib/utils";

import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function FakturForm({ form }: { form: UseFormReturn<FakturFormValues> }) {
  const values = form.watch();
  const errors = form.formState.errors;

  return (
    <div className="space-y-6">
      <BuilderSection title="Sumber">
        <div className="space-y-4">
          <Field>
            <FieldLabel>No. Penawaran (Deal)</FieldLabel>
            <div className="flex h-9 items-center rounded-lg border border-input bg-muted/40 px-3 font-mono text-sm text-muted-foreground">
              {values.sphId || "—"}
            </div>
          </Field>
          <div className="flex flex-wrap gap-4">
            <DateField label="Tanggal" value={values.tanggal} invalid={!!errors.tanggal}
              onChange={(v) => form.setValue("tanggal", v, { shouldValidate: true })} />
            <DateField label="Jatuh Tempo" value={values.jatuhTempo} invalid={!!errors.jatuhTempo}
              onChange={(v) => form.setValue("jatuhTempo", v, { shouldValidate: true })} />
          </div>
        </div>
      </BuilderSection>

      <BuilderSection title="Baris Tagihan">
        <ItemsEditor items={values.items} resetKey={values.sphId}
          onChange={(v) => form.setValue("items", v, { shouldValidate: true })} />
        <FieldError className="mt-2" errors={errors.items?.message ? [{ message: errors.items.message }] : undefined} />
      </BuilderSection>

      <BuilderSection title="Termin yang Ditagih">
        <Select value={String(values.terminIndex)} onValueChange={(v) => form.setValue("terminIndex", Number(v), { shouldValidate: true })}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Pilih termin" /></SelectTrigger>
          <SelectContent>
            {values.terminList.map((t, i) => (
              <SelectItem key={i} value={String(i)}>
                {t.label} — {t.persen}% {t.pemicu ? `(${t.pemicu})` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </BuilderSection>

      <BuilderSection title="Pajak">
        <div className="space-y-3">
          <TaxRow label="PPN" aktif={values.ppnAktif} persen={values.ppnPersen}
            onToggle={(c) => form.setValue("ppnAktif", c)} onPersen={(n) => form.setValue("ppnPersen", n)} />
          <TaxRow label="PPh 23" aktif={values.pph23Aktif} persen={values.pph23Persen}
            onToggle={(c) => form.setValue("pph23Aktif", c)} onPersen={(n) => form.setValue("pph23Persen", n)} />
        </div>
      </BuilderSection>

      <BuilderSection title="Catatan Tambahan">
        <CatatanEditor catatan={values.catatan} onChange={(v) => form.setValue("catatan", v)} />
      </BuilderSection>

      <BuilderSection title="Status & Pembayaran">
        <div className="flex flex-wrap items-end gap-4">
          <div className="w-48">
            <label className="text-xs text-muted-foreground">Status</label>
            <Select value={values.status} onValueChange={(v) => form.setValue("status", v as FakturFormValues["status"])}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="terkirim">Terkirim</SelectItem>
                <SelectItem value="lunas">Lunas</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {values.status === "lunas" && (
            <DateField label="Tanggal Bayar" value={values.tanggalBayar}
              onChange={(v) => form.setValue("tanggalBayar", v)} />
          )}
        </div>
      </BuilderSection>
    </div>
  );
}

function DateField({ label, value, onChange, invalid }: { label: string; value: string; onChange: (v: string) => void; invalid?: boolean }) {
  const [open, setOpen] = React.useState(false);
  const date = value ? new Date(value + "T00:00:00") : undefined;
  return (
    <Field data-invalid={invalid} className="w-56">
      <FieldLabel>{label}</FieldLabel>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" className={cn("w-full justify-start font-normal", !date && "text-muted-foreground")}>
            <CalendarIcon />
            {date ? format(date, "dd MMMM yyyy", { locale: idLocale }) : "Pilih tanggal"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={date} locale={idLocale} autoFocus
            onSelect={(d) => { onChange(d ? format(d, "yyyy-MM-dd") : ""); setOpen(false); }} />
        </PopoverContent>
      </Popover>
    </Field>
  );
}

function ItemsEditor({ items, onChange, resetKey }: { items: FakturFormValues["items"]; onChange: (v: FakturFormValues["items"]) => void; resetKey: string }) {
  const update = (i: number, patch: Partial<FakturFormValues["items"][number]>) =>
    onChange(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const removeRow = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const addRow = () => onChange([...items, { uraian: "", volume: 1, harga: 0, satuan: "Paket" }]);
  return (
    <div className="space-y-3">
      {items.map((it, i) => (
        <div key={i} className="space-y-3 rounded-md border border-border p-3">
          <div>
            <label className="text-xs text-muted-foreground">Uraian</label>
            <Input value={it.uraian} onChange={(e) => update(i, { uraian: e.target.value })} placeholder="Penyusunan…" />
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-20">
              <label className="text-xs text-muted-foreground">Volume</label>
              <Input type="number" min={1} value={it.volume} onChange={(e) => update(i, { volume: Number(e.target.value) })} className="text-right font-mono tabular-nums" />
            </div>
            <div className="w-24">
              <label className="text-xs text-muted-foreground">Satuan</label>
              <Input value={it.satuan} onChange={(e) => update(i, { satuan: e.target.value })} placeholder="Paket" />
            </div>
            <div className="w-44">
              <label className="text-xs text-muted-foreground">Biaya Satuan</label>
              <MoneyInput key={`${i}:${resetKey}`} defaultValue={it.harga} onValueChange={(n) => update(i, { harga: n })} showTerbilang={false} className="w-full" />
            </div>
            <Button type="button" variant="ghost" size="icon" className="ml-auto" aria-label="Hapus baris" onClick={() => removeRow(i)}>
              <Trash2Icon className="size-4 text-destructive" />
            </Button>
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addRow}><Plus className="size-4" /> Tambah Baris</Button>
    </div>
  );
}

function TaxRow({ label, aktif, persen, onToggle, onPersen }: { label: string; aktif: boolean; persen: number; onToggle: (c: boolean) => void; onPersen: (n: number) => void }) {
  return (
    <div className="flex items-center gap-3">
      <label className="flex w-28 items-center gap-2 text-sm">
        <Checkbox checked={aktif} onCheckedChange={(c) => onToggle(c === true)} /> {label}
      </label>
      {aktif && (
        <div className="flex items-center gap-1">
          <Input type="number" min={0} value={persen} onChange={(e) => onPersen(Number(e.target.value) || 0)} className="w-20 text-right font-mono tabular-nums" />
          <span className="text-sm text-muted-foreground">%</span>
        </div>
      )}
    </div>
  );
}

function CatatanEditor({ catatan, onChange }: { catatan: string[]; onChange: (v: string[]) => void }) {
  const update = (i: number, value: string) => onChange(catatan.map((c, idx) => (idx === i ? value : c)));
  const removeRow = (i: number) => onChange(catatan.filter((_, idx) => idx !== i));
  const addRow = () => onChange([...catatan, ""]);
  return (
    <div className="space-y-3">
      {catatan.map((c, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-muted-foreground">•</span>
          <Input value={c} onChange={(e) => update(i, e.target.value)} placeholder="Tulis catatan…" />
          <Button type="button" variant="ghost" size="icon" aria-label="Hapus catatan" onClick={() => removeRow(i)}>
            <Trash2Icon className="size-4 text-destructive" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addRow}>Tambah Catatan</Button>
    </div>
  );
}
