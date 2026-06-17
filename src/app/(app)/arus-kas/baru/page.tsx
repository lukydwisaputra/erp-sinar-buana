"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { ArrowLeft, ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { MoneyInput } from "@/components/shared/money-input";
import {
  arusKasFormSchema, type ArusKasFormValues, MANUAL_KATEGORIS,
} from "@/lib/schemas/arus-kas";
import { useCreateArusKas } from "@/lib/query/arus-kas";
import { useProyekList } from "@/lib/query/proyek";

const JENIS_OPTS = [
  { value: "kredit", label: "Pemasukan (Kredit)" },
  { value: "debit", label: "Pengeluaran (Debit)" },
] as const;

const KATEGORI_LABELS: Record<string, string> = {
  operasional: "Operasional",
  lainnya: "Lainnya",
};

export default function ArusKasBaruPage() {
  const router = useRouter();
  const createMutation = useCreateArusKas();
  const { data: proyekList = [] } = useProyekList();

  const form = useForm<ArusKasFormValues>({
    resolver: zodResolver(arusKasFormSchema),
    defaultValues: {
      jenis: "debit",
      tanggal: format(new Date(), "yyyy-MM-dd"),
      jumlah: 0,
      kategori: "operasional",
      keterangan: "",
      proyekId: undefined,
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    await createMutation.mutateAsync(values);
    router.push("/arus-kas");
  });

  return (
    <div className="space-y-6 max-w-lg">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="size-8" onClick={() => router.push("/arus-kas")}>
          <ArrowLeft className="size-4" />
        </Button>
        <ArrowRightLeft className="size-5 text-muted-foreground" />
        <h1 className="text-xl font-semibold tracking-tight">Tambah Transaksi</h1>
      </div>

      <form onSubmit={onSubmit} className="space-y-5">
        {/* Jenis */}
        <Field>
          <FieldLabel>Jenis</FieldLabel>
          <div className="flex gap-2">
            {JENIS_OPTS.map((o) => (
              <Button
                key={o.value}
                type="button"
                variant={form.watch("jenis") === o.value ? "default" : "outline"}
                size="sm"
                onClick={() => form.setValue("jenis", o.value, { shouldValidate: true })}
              >
                {o.label}
              </Button>
            ))}
          </div>
          <FieldError>{form.formState.errors.jenis?.message}</FieldError>
        </Field>

        {/* Tanggal */}
        <Field>
          <FieldLabel>Tanggal</FieldLabel>
          <DatePicker
            value={form.watch("tanggal") ? new Date(form.watch("tanggal") + "T00:00:00") : undefined}
            onChange={(d) => form.setValue("tanggal", d ? format(d, "yyyy-MM-dd") : "", { shouldValidate: true })}
          />
          <FieldError>{form.formState.errors.tanggal?.message}</FieldError>
        </Field>

        {/* Jumlah */}
        <Field>
          <FieldLabel>Jumlah</FieldLabel>
          <MoneyInput
            defaultValue={0}
            onValueChange={(v) => form.setValue("jumlah", v, { shouldValidate: true })}
          />
          <FieldError>{form.formState.errors.jumlah?.message}</FieldError>
        </Field>

        {/* Kategori */}
        <Field>
          <FieldLabel>Kategori</FieldLabel>
          <Select
            value={form.watch("kategori")}
            onValueChange={(v) => form.setValue("kategori", v as "operasional" | "lainnya", { shouldValidate: true })}
          >
            <SelectTrigger className="w-72">
              <SelectValue placeholder="Pilih kategori" />
            </SelectTrigger>
            <SelectContent>
              {MANUAL_KATEGORIS.map((k) => (
                <SelectItem key={k} value={k}>{KATEGORI_LABELS[k]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError>{form.formState.errors.kategori?.message}</FieldError>
        </Field>

        {/* Keterangan */}
        <Field>
          <FieldLabel>Keterangan</FieldLabel>
          <Input
            {...form.register("keterangan")}
            placeholder="Deskripsi transaksi"
            className="w-72"
          />
          <FieldError>{form.formState.errors.keterangan?.message}</FieldError>
        </Field>

        {/* Proyek (optional) */}
        <Field>
          <FieldLabel>Proyek <span className="text-muted-foreground font-normal">(opsional)</span></FieldLabel>
          <Select
            value={form.watch("proyekId") ?? ""}
            onValueChange={(v) => form.setValue("proyekId", v || undefined)}
          >
            <SelectTrigger className="w-72">
              <SelectValue placeholder="— Tidak ditautkan —" />
            </SelectTrigger>
            <SelectContent>
              {proyekList.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.nama}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        {/* Submit */}
        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Menyimpan…" : "Simpan"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push("/arus-kas")}>
            Batal
          </Button>
        </div>
      </form>
    </div>
  );
}
