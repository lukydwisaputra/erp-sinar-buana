"use client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { periodePreset, PRESET_LABELS, type PeriodePreset } from "@/lib/dasbor/periode-utils";
import type { Periode } from "@/lib/dasbor/types";

interface PeriodPickerProps {
  value: Periode;
  onChange: (p: Periode) => void;
}

export function PeriodPicker({ value, onChange }: PeriodPickerProps) {
  const currentPreset = (): PeriodePreset | "" => {
    const presets: PeriodePreset[] = ["mtd", "qtd", "ytd"];
    return (
      presets.find((p) => {
        const preset = periodePreset(p);
        return preset.mulai === value.mulai && preset.selesai === value.selesai;
      }) ?? ""
    );
  };

  const handleChange = (preset: PeriodePreset) => {
    onChange(periodePreset(preset));
  };

  return (
    <Select value={currentPreset()} onValueChange={(v) => handleChange(v as PeriodePreset)}>
      <SelectTrigger className="w-40">
        <SelectValue placeholder="Pilih periode" />
      </SelectTrigger>
      <SelectContent>
        {(["mtd", "qtd", "ytd"] as PeriodePreset[]).map((p) => (
          <SelectItem key={p} value={p}>
            {PRESET_LABELS[p]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
