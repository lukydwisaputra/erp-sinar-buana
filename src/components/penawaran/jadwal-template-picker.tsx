"use client";

import * as React from "react";
import { FileStack } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { useJadwalTemplateList } from "@/lib/query/jadwal-templates";
import type { Jadwal } from "@/components/shared/rab-jadwal-editor";

/** Applies a Jadwal template as a one-time copy — replaces the current
 * Estimasi Jadwal, no live link back to the template afterward. */
export function JadwalTemplatePicker({ onApply }: { onApply: (jadwal: Jadwal) => void }) {
  const { data: templates = [] } = useJadwalTemplateList();
  const [open, setOpen] = React.useState(false);

  if (!templates.length) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <FileStack className="size-4" /> Gunakan Template Jadwal
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command>
          <CommandInput placeholder="Cari template jadwal…" />
          <CommandList>
            <CommandEmpty>Tidak ada template.</CommandEmpty>
            <CommandGroup>
              {templates.map((t) => (
                <CommandItem
                  key={t.id}
                  value={t.nama}
                  onSelect={() => {
                    onApply({
                      kegiatan: [...t.kegiatan],
                      highlights: t.highlights.map((h) => [...h]),
                      bulan: t.bulan,
                    });
                    setOpen(false);
                  }}
                >
                  {t.nama}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
