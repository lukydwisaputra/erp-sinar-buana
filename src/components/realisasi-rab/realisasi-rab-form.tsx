"use client";
import { useEffect, useState } from "react";
import { FormSheet } from "@/components/shared/form-sheet";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MoneyInput } from "@/components/shared/money-input";
import { useCreateRealisasiRab, useUpdateRealisasiRab } from "@/lib/query/realisasi-rab";
import type { RealisasiRab, RealisasiRabFormValues } from "@/lib/schemas/realisasi-rab";

interface RealisasiRabFormProps {
  proyekId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present = edit an existing actual; absent = create a new one. */
  editing?: RealisasiRab | null;
}

const EMPTY = (proyekId: string): RealisasiRabFormValues => ({
  proyekId,
  kategori: "personil",
  rabLineLabel: "",
  jumlah: 0,
  tanggal: new Date().toISOString().slice(0, 10),
  keterangan: "",
});

const FROM_EXISTING = (r: RealisasiRab): RealisasiRabFormValues => ({
  proyekId: r.proyekId,
  kategori: r.kategori,
  rabLineLabel: r.rabLineLabel,
  jumlah: r.jumlah,
  tanggal: r.tanggal,
  keterangan: r.keterangan,
});

export function RealisasiRabForm({ proyekId, open, onOpenChange, editing }: RealisasiRabFormProps) {
  const [form, setForm] = useState<RealisasiRabFormValues>(() => (editing ? FROM_EXISTING(editing) : EMPTY(proyekId)));
  const [formKey, setFormKey] = useState(0);
  const { mutateAsync: createAsync } = useCreateRealisasiRab();
  const { mutateAsync: updateAsync } = useUpdateRealisasiRab();

  useEffect(() => {
    const resetForm = () => {
      setForm(editing ? FROM_EXISTING(editing) : EMPTY(proyekId));
      setFormKey((k) => k + 1);
    };
    if (open) resetForm();
  }, [open, editing, proyekId]);

  const set = <K extends keyof RealisasiRabFormValues>(key: K, val: RealisasiRabFormValues[K]) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const submitDisabled =
    form.rabLineLabel.trim().length === 0 ||
    form.jumlah <= 0 ||
    form.tanggal.length < 10 ||
    form.keterangan.trim().length === 0;

  const handleSubmit = async () => {
    if (editing) {
      await updateAsync({ id: editing.id, proyekId, input: form });
    } else {
      await createAsync(form);
    }
    setForm(EMPTY(proyekId));
    setFormKey((k) => k + 1);
    onOpenChange(false);
  };

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={editing ? "Ubah Realisasi RAB" : "Catat Realisasi RAB"}
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
