"use client";

import * as React from "react";
import type { UseFormReturn } from "react-hook-form";
import { Trash2Icon } from "lucide-react";

import type { SphFormValues } from "@/lib/schemas/penawaran";
import { BuilderSection } from "@/components/shared/builder-layout";
import { LineItemEditor, type ServiceOption } from "@/components/shared/line-item-editor";
import { MoneyInput } from "@/components/shared/money-input";
import {
  totalPenawaran,
  totalRab,
  margin,
  terminPersenTotal,
  isTerminValid,
} from "@/lib/sph";
import { formatRupiah } from "@/lib/format";
import { terbilang } from "@/lib/terbilang";
import { cn } from "@/lib/utils";

import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type PerusahaanOption = { id: string; nama: string; alamat: string; pics: string[] };
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

      <BuilderSection title="Baris Layanan">
        <LineItemEditor
          items={values.items}
          options={layananOptions as ServiceOption[]}
          onChange={(v) => form.setValue("items", v, { shouldValidate: true })}
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

      <BuilderSection title="Skema Termin">
        <TerminEditor
          termin={values.termin}
          onChange={(v) => form.setValue("termin", v, { shouldValidate: true })}
        />
      </BuilderSection>

      <RabSection form={form} />

      <BuilderSection title="Catatan & Ketentuan">
        <Textarea
          rows={4}
          placeholder="Syarat, ketentuan, atau catatan tambahan…"
          {...form.register("catatan")}
        />
      </BuilderSection>
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
  const alamat = form.watch("alamat");
  const pic = form.watch("pic");
  const selected = perusahaanOptions.find((p) => p.id === perusahaanId);
  const pics = selected?.pics ?? [];
  const errors = form.formState.errors;

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
              form.setValue("pic", opt.pics[0] ?? "");
            }}
          />
          <FieldError errors={err(errors.perusahaanId)} />
        </Field>

        <Field>
          <FieldLabel>PIC</FieldLabel>
          <Select
            value={pic || undefined}
            onValueChange={(v) => form.setValue("pic", v, { shouldValidate: true })}
            disabled={!selected}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Pilih PIC…" />
            </SelectTrigger>
            <SelectContent>
              {pics.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field>
          <FieldLabel>Alamat</FieldLabel>
          <p className="text-sm text-muted-foreground">{alamat || "—"}</p>
        </Field>

        <div className="flex flex-wrap gap-4">
          <Field data-invalid={!!errors.tanggal} className="w-44">
            <FieldLabel>Tanggal</FieldLabel>
            <Input type="date" aria-invalid={!!errors.tanggal} {...form.register("tanggal")} />
            <FieldError errors={err(errors.tanggal)} />
          </Field>

          <Field data-invalid={!!errors.masaBerlaku} className="w-44">
            <FieldLabel>Masa Berlaku (hari)</FieldLabel>
            <Input
              type="number"
              min={1}
              aria-invalid={!!errors.masaBerlaku}
              className="font-mono tabular-nums"
              {...form.register("masaBerlaku")}
            />
            <FieldError errors={err(errors.masaBerlaku)} />
          </Field>
        </div>
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
              value={t.persen}
              onChange={(e) => update(i, { persen: Number(e.target.value) })}
              className="text-right font-mono tabular-nums"
            />
          </div>
          <div className="min-w-40 flex-1">
            <label className="text-xs text-muted-foreground">Pemicu</label>
            <Input value={t.pemicu} onChange={(e) => update(i, { pemicu: e.target.value })} />
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

      <Button type="button" variant="outline" size="sm" onClick={addRow}>
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

/* ---------- 4. RAB Internal ---------- */
function RabSection({ form }: { form: UseFormReturn<SphFormValues> }) {
  const rab = form.watch("rab");
  const items = form.watch("items");
  const m = margin(items, rab);

  return (
    <BuilderSection
      title="RAB Internal"
      action={<Badge variant="secondary">Internal — tidak tampil ke klien</Badge>}
    >
      <Collapsible>
        <CollapsibleTrigger asChild>
          <Button type="button" variant="outline" size="sm">
            Tampilkan / Sembunyikan
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-4 space-y-4">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Biaya Personil (A)</label>
            <MoneyInput
              defaultValue={rab.personil}
              onValueChange={(n) => form.setValue("rab.personil", n, { shouldValidate: true })}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Biaya Langsung (B)</label>
            <MoneyInput
              defaultValue={rab.langsung}
              onValueChange={(n) => form.setValue("rab.langsung", n, { shouldValidate: true })}
            />
          </div>

          <div className="space-y-1 border-t border-border pt-3 text-sm">
            <div>
              <span className="text-muted-foreground">Total RAB: </span>
              <span className="font-mono tabular-nums">{formatRupiah(totalRab(rab))}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Estimasi Margin: </span>
              <span
                className={cn(
                  "font-mono tabular-nums font-semibold",
                  m >= 0 ? "text-success" : "text-destructive"
                )}
              >
                {formatRupiah(m)}
              </span>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </BuilderSection>
  );
}
