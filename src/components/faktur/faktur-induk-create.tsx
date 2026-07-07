"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ReceiptText, Plus, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { SectionLabel } from "@/components/shared/detail-drawer";
import { MoneyInput } from "@/components/shared/money-input";
import { formatRupiah } from "@/lib/format";
import { onFormInvalid } from "@/lib/form-toast";
import { useCreateFakturInduk } from "@/lib/query/faktur";
import { createFakturIndukSchema, type CreateFakturIndukInput } from "@/lib/schemas/faktur";
import type { Proyek } from "@/lib/schemas/proyek";

export function FakturIndukCreate({ proyek }: { proyek: Proyek }) {
  const router = useRouter();
  const createFaktur = useCreateFakturInduk();
  const totalKontrak = proyek.nilaiKontrak ?? 0;

  const form = useForm<CreateFakturIndukInput>({
    resolver: zodResolver(createFakturIndukSchema) as Resolver<CreateFakturIndukInput>,
    defaultValues: {
      proyekId: proyek.id,
      serviceIds: proyek.layanan.map((l) => l.serviceId).filter((x): x is string => !!x),
      totalBiaya: totalKontrak,
      notes: "",
      terminScheme: [{ label: "Termin I", persen: 100 }],
    },
  });
  const { control, register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = form;
  const values = watch();
  const terminSchemeTotal = values.terminScheme.reduce((s, t) => s + (Number(t.persen) || 0), 0);

  const toggleService = (serviceId: string, checked: boolean) => {
    const next = checked
      ? [...values.serviceIds, serviceId]
      : values.serviceIds.filter((id) => id !== serviceId);
    setValue("serviceIds", next, { shouldValidate: true });
  };

  const addTerm = () => setValue("terminScheme", [...values.terminScheme, { label: `Termin ${values.terminScheme.length + 1}`, persen: 0 }]);
  const removeTerm = (i: number) => setValue("terminScheme", values.terminScheme.filter((_, idx) => idx !== i), { shouldValidate: true });
  const updateTerm = (i: number, patch: Partial<{ label: string; persen: number }>) =>
    setValue("terminScheme", values.terminScheme.map((t, idx) => (idx === i ? { ...t, ...patch } : t)), { shouldValidate: true });

  const onSubmit = handleSubmit(async (data) => {
    const induk = await createFaktur.mutateAsync(data);
    router.push(`/faktur/${encodeURIComponent(induk.id)}`);
  }, onFormInvalid);

  return (
    <div className="mx-auto max-w-xl space-y-6 px-4 py-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="size-8">
          <ArrowLeft className="size-4" />
        </Button>
        <div className="flex items-center gap-2">
          <ReceiptText className="size-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold tracking-tight">Buat Faktur Induk</h1>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
        <SectionLabel>Dari Proyek</SectionLabel>
        <p className="font-medium">{proyek.nama}</p>
        <p className="text-sm text-muted-foreground">{proyek.perusahaanNama}</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        <div className="space-y-2">
          <SectionLabel>Layanan yang Ditagih</SectionLabel>
          {proyek.layanan.length === 0 && <p className="text-sm text-muted-foreground">Proyek ini tidak memiliki layanan.</p>}
          <div className="space-y-2">
            {proyek.layanan.map((l, i) => {
              const key = l.serviceId ?? `desc-${i}`;
              const checked = l.serviceId ? values.serviceIds.includes(l.serviceId) : false;
              return (
                <label key={key} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={checked}
                    disabled={!l.serviceId}
                    onCheckedChange={(c) => l.serviceId && toggleService(l.serviceId, c === true)}
                  />
                  {l.nama}
                </label>
              );
            })}
          </div>
        </div>

        <Field data-invalid={!!errors.totalBiaya}>
          <FieldLabel>Total Biaya</FieldLabel>
          <Controller
            control={control}
            name="totalBiaya"
            render={({ field }) => (
              <MoneyInput defaultValue={field.value} onValueChange={field.onChange} className="w-full" />
            )}
          />
          <FieldError errors={errors.totalBiaya ? [{ message: errors.totalBiaya.message }] : undefined} />
        </Field>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <SectionLabel>Skema Termin</SectionLabel>
            <span className={terminSchemeTotal === 100 ? "text-xs text-muted-foreground" : "text-xs text-destructive"}>
              Total {terminSchemeTotal}%
            </span>
          </div>
          <div className="space-y-2">
            {values.terminScheme.map((t, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={t.label}
                  onChange={(e) => updateTerm(i, { label: e.target.value })}
                  placeholder="Termin I"
                  className="flex-1"
                />
                <Input
                  type="number" min={0} max={100}
                  value={t.persen}
                  onChange={(e) => updateTerm(i, { persen: Number(e.target.value) || 0 })}
                  className="w-20 text-right font-mono tabular-nums"
                />
                <span className="text-sm text-muted-foreground">%</span>
                <Button type="button" variant="ghost" size="icon" aria-label="Hapus termin" onClick={() => removeTerm(i)}>
                  <Trash2Icon className="size-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addTerm}><Plus className="size-4" /> Tambah Termin</Button>
          <FieldError errors={errors.terminScheme?.message ? [{ message: errors.terminScheme.message }] : undefined} />
        </div>

        <Field>
          <FieldLabel>Catatan</FieldLabel>
          <Input {...register("notes")} placeholder="Catatan tambahan (opsional)" />
        </Field>

        {values.totalBiaya > 0 && (
          <p className="text-sm text-muted-foreground">
            Nilai per 100%: <span className="font-mono tabular-nums">{formatRupiah(values.totalBiaya)}</span>
          </p>
        )}

        <Button type="submit" loading={isSubmitting} className="w-full">Buat Faktur Induk</Button>
      </form>
    </div>
  );
}
