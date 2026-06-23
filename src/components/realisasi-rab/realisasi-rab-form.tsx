"use client";
import { useState } from "react";
import { FormSheet } from "@/components/shared/form-sheet";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MoneyInput } from "@/components/shared/money-input";
import { useCreateRealisasiRab } from "@/lib/query/realisasi-rab";
import type { RealisasiRabFormValues } from "@/lib/schemas/realisasi-rab";

interface RealisasiRabFormProps {
  proyekId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EMPTY = (proyekId: string): RealisasiRabFormValues => ({
  proyekId,
  kategori: "personil",
  rabLineLabel: "",
  jumlah: 0,
  tanggal: new Date().toISOString().slice(0, 10),
  keterangan: "",
});

export function RealisasiRabForm({ proyekId, open, onOpenChange }: RealisasiRabFormProps) {
  const [form, setForm] = useState<RealisasiRabFormValues>(() => EMPTY(proyekId));
  const [formKey, setFormKey] = useState(0);
  const { mutateAsync } = useCreateRealisasiRab();

  const set = <K extends keyof RealisasiRabFormValues>(key: K, val: RealisasiRabFormValues[K]) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const submitDisabled =
    form.rabLineLabel.trim().length === 0 ||
    form.jumlah <= 0 ||
    form.tanggal.length < 10 ||
    form.keterangan.trim().length === 0;

  const handleSubmit = async () => {
    await mutateAsync(form);
    setForm(EMPTY(proyekId));
    setFormKey((k) => k + 1);
    onOpenChange(false);
  };

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Catat Realisasi RAB"
      description="Masukkan biaya aktual yang telah dikeluarkan untuk proyek ini."
      onSubmit={handleSubmit}
      submitDisabled={submitDisabled}
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>Kategori</Label>
          <Select
            value={form.kategori}
            onValueChange={(v) => set("kategori", v as "personil" | "langsung")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="personil">Personil (A)</SelectItem>
              <SelectItem value="langsung">Langsung (B)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Label RAB</Label>
          <Input
            placeholder="Mis: Tenaga Ahli 1, Material Kabel"
            value={form.rabLineLabel}
            onChange={(e) => set("rabLineLabel", e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Jumlah (IDR)</Label>
          <MoneyInput
            key={formKey}
            defaultValue={form.jumlah}
            onValueChange={(v) => set("jumlah", v)}
            className="w-full"
          />
        </div>

        <div className="space-y-1.5">
          <Label>Tanggal</Label>
          <Input
            type="date"
            value={form.tanggal}
            onChange={(e) => set("tanggal", e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Keterangan</Label>
          <Input
            placeholder="Catatan tambahan"
            value={form.keterangan}
            onChange={(e) => set("keterangan", e.target.value)}
          />
        </div>
      </div>
    </FormSheet>
  );
}
