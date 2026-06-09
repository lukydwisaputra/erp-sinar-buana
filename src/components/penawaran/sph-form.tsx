"use client";

import * as React from "react";
import type { UseFormReturn } from "react-hook-form";
import { Trash2Icon, CalendarIcon, SlidersHorizontal } from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

import type { SphFormValues } from "@/lib/schemas/penawaran";
import { BuilderSection } from "@/components/shared/builder-layout";
import { LineItemEditor, type ServiceOption } from "@/components/shared/line-item-editor";
import { ServiceRabJadwalEditor } from "@/components/penawaran/service-rab-jadwal-editor";
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

export type PerusahaanOption = { id: string; nama: string; alamat: string };
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
        <LineItemEditor
          items={values.items}
          options={layananOptions as ServiceOption[]}
          onChange={(v) => form.setValue("items", v, { shouldValidate: true })}
          renderRowExtra={(it, i, update) => (
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
                  <SlidersHorizontal className="size-4" /> Kelola RAB &amp; Jadwal
                </Button>
              }
            />
          )}
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

      <RabSection form={form} />

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
    </div>
  );
}

/* ---------- Masa Berlaku (day-count) ---------- */
function MasaBerlakuField({ form }: { form: UseFormReturn<SphFormValues> }) {
  const masaBerlakuAktif = form.watch("masaBerlakuAktif");
  const masaBerlakuHari = form.watch("masaBerlakuHari");

  return (
    <Field>
      <label className="flex items-center gap-2 text-sm">
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
          <span className="text-sm text-muted-foreground">hari kalender</span>
        </div>
      )}
    </Field>
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
            }}
          />
          <FieldError errors={err(errors.perusahaanId)} />
        </Field>

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
          <Input {...form.register("lampiran")} placeholder="RAB dan Estimasi Waktu" />
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

/* ---------- 4. RAB Internal (read-only summary; detail dikelola per layanan) ---------- */
function RabSection({ form }: { form: UseFormReturn<SphFormValues> }) {
  const items = form.watch("items");
  const total = totalRab(items);
  const m = margin(items);

  return (
    <BuilderSection
      title="RAB Internal"
      action={<Badge variant="secondary">Internal — tidak tampil ke klien</Badge>}
    >
      <div className="space-y-3 text-sm">
        <div className="space-y-1 border-b border-border pb-3">
          <div>
            <span className="text-muted-foreground">Total RAB: </span>
            <span className="font-mono tabular-nums">{formatRupiah(total)}</span>
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
        <p className="text-xs text-muted-foreground">
          RAB rinci dikelola per layanan (lihat Baris Layanan).
        </p>
      </div>
    </BuilderSection>
  );
}
