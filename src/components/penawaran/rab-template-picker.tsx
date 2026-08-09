"use client";

import * as React from "react";
import { FileStack } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { useRabTemplateList } from "@/lib/query/rab-templates";
import type { Rab } from "@/components/shared/rab-jadwal-editor";

/** Applies a RAB template as a one-time copy (like "Salin dari layanan
 * sebelumnya" just above it) — replaces the current RAB, no live link back
 * to the template afterward. */
export function RabTemplatePicker({ onApply }: { onApply: (rab: Rab) => void }) {
  const { data: templates = [] } = useRabTemplateList();
  const [open, setOpen] = React.useState(false);

  if (!templates.length) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <FileStack className="size-4" /> Gunakan Template RAB
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command>
          <CommandInput placeholder="Cari template RAB…" />
          <CommandList>
            <CommandEmpty>Tidak ada template.</CommandEmpty>
            <CommandGroup>
              {templates.map((t) => (
                <CommandItem
                  key={t.id}
                  value={t.nama}
                  onSelect={() => {
                    onApply({
                      personil: t.personil.map((r) => ({ ...r })),
                      langsung: t.langsung.map((r) => ({ ...r })),
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
