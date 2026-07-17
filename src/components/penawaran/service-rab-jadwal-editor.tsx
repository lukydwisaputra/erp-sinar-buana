"use client";

import * as React from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RabEditor, JadwalEditor, type Rab, type Jadwal } from "@/components/shared/rab-jadwal-editor";
import { RabTemplatePicker } from "@/components/penawaran/rab-template-picker";
import { JadwalTemplatePicker } from "@/components/penawaran/jadwal-template-picker";

const EMPTY_RAB: Rab = { personil: [], langsung: [] };
const EMPTY_JADWAL: Jadwal = { kegiatan: [], highlights: [], bulan: 1 };
const cloneRab = (r: Rab): Rab => ({
  personil: r.personil.map((x) => ({ ...x })),
  langsung: r.langsung.map((x) => ({ ...x })),
});
const cloneJadwal = (j: Jadwal): Jadwal => ({
  kegiatan: [...j.kegiatan],
  highlights: j.highlights.map((h) => [...h]),
  bulan: j.bulan,
});
const sameData = (rA: Rab, jA: Jadwal, rB: Rab, jB: Jadwal): boolean =>
  JSON.stringify([rA, jA]) === JSON.stringify([rB, jB]);

export function ServiceRabJadwalEditor({
  serviceName,
  rab,
  jadwal,
  previous,
  onChange,
  trigger,
}: {
  serviceName: string;
  rab: Rab;
  jadwal: Jadwal;
  previous?: { rab: Rab; jadwal: Jadwal };
  onChange: (patch: { rab?: Rab; jadwal?: Jadwal }) => void;
  trigger: React.ReactNode;
}): React.JSX.Element {
  const setRab = (next: Rab) => onChange({ rab: next });
  const setJadwal = (next: Jadwal) => onChange({ jadwal: next });

  const [salin, setSalin] = React.useState(() =>
    previous ? sameData(rab, jadwal, previous.rab, previous.jadwal) : false,
  );
  const toggleSalin = (checked: boolean) => {
    setSalin(checked);
    if (!previous) return;
    if (checked) {
      onChange({ rab: cloneRab(previous.rab), jadwal: cloneJadwal(previous.jadwal) });
    } else {
      onChange({ rab: cloneRab(EMPTY_RAB), jadwal: cloneJadwal(EMPTY_JADWAL) });
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="w-[80vw] h-[80vh] max-w-[80vw]! p-0 flex flex-col overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-3 border-b">
          <DialogTitle>
            Kelola RAB &amp; Jadwal — {serviceName || "Layanan"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {previous && (
            <label className="mb-4 flex cursor-pointer items-center gap-2 rounded-md border border-border p-3 text-sm">
              <Checkbox
                checked={salin}
                onCheckedChange={(c) => toggleSalin(c === true)}
              />
              Salin RAB &amp; Estimasi Jadwal dari layanan sebelumnya
            </label>
          )}
          <Tabs defaultValue="rab">
            <TabsList>
              <TabsTrigger value="rab">RAB</TabsTrigger>
              <TabsTrigger value="jadwal">Estimasi Jadwal</TabsTrigger>
            </TabsList>

            <TabsContent value="rab" className="mt-6 space-y-4">
              <RabTemplatePicker onApply={setRab} />
              <RabEditor rab={rab} onChange={setRab} />
            </TabsContent>

            <TabsContent value="jadwal" className="mt-6 space-y-4">
              <JadwalTemplatePicker onApply={setJadwal} />
              <JadwalEditor jadwal={jadwal} onChange={setJadwal} />
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
