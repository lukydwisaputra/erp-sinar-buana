"use client";

import * as React from "react";
import type { UseFormReturn } from "react-hook-form";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

import type { SphFormValues } from "@/lib/schemas/penawaran";
import type { PIC } from "@/lib/schemas/perusahaan";
import { salutationValues, SALUTATION_LABEL } from "@/lib/schemas/common";
import { BuilderSection } from "@/components/shared/builder-layout";
import { cn } from "@/lib/utils";

import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type PerusahaanOption = { id: string; nama: string; alamat: string; pic: PIC[] };

const err = (e: { message?: string } | undefined) => (e ? [e] : undefined);

/* ---------- 1. Tujuan Penawaran ---------- */
export function TujuanSection({
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

        <div className="flex gap-2">
          <Field className="w-40">
            <FieldLabel>Sapaan</FieldLabel>
            <Select
              value={form.watch("salutasiPenerima")}
              onValueChange={(v) => form.setValue("salutasiPenerima", v as SphFormValues["salutasiPenerima"])}
            >
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {salutationValues.map((v) => <SelectItem key={v} value={v}>{SALUTATION_LABEL[v]}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field className="flex-1">
            <FieldLabel>Jabatan</FieldLabel>
            <Input {...form.register("jabatanPenerima")} placeholder="Direktur" />
          </Field>
        </div>

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
              Cantumkan nama PIC (u.p.)
            </label>
            {picAktif && (
              <PicPicker
                options={selected.pic}
                selectedNama={picNama}
                onPick={(p) => {
                  form.setValue("picNama", p.nama);
                  form.setValue("picJabatan", p.jabatan);
                  form.setValue("picSalutation", p.salutation);
                }}
              />
            )}
          </div>
        )}

        <Field>
          <FieldLabel>Tempat</FieldLabel>
          <Input {...form.register("tempat")} placeholder="Tempat" />
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
          {selected ? selected.nama : "Pilih PIC…"}
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
                  <p>{p.nama}</p>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
