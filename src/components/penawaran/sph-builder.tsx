"use client";

import * as React from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Maximize2, Save, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { BuilderLayout } from "@/components/shared/builder-layout";
import {
  SphForm,
  type PerusahaanOption,
  type LayananOption,
} from "@/components/penawaran/sph-form";
import { SphDocument } from "@/components/penawaran/sph-document";
import { perusahaanFixtures } from "@/lib/fixtures/perusahaan";
import { katalogFixtures } from "@/lib/fixtures/katalog";
import {
  sphFormSchema,
  type SphFormValues,
  type Sph,
} from "@/lib/schemas/penawaran";

const perusahaanOptions: PerusahaanOption[] = perusahaanFixtures.map((p) => ({
  id: p.id,
  nama: p.nama,
  alamat: p.alamat,
  pics: p.pic.map((x) => x.nama),
}));

const layananOptions: LayananOption[] = katalogFixtures.map((l) => ({
  id: l.id,
  nama: l.nama,
  harga: l.hargaStandar ?? 0,
}));

const emptyValues: SphFormValues = {
  perusahaanId: "",
  perusahaanNama: "",
  pic: "",
  alamat: "",
  tanggal: "",
  masaBerlaku: 14,
  items: [{ layananId: "", nama: "", volume: 1, harga: 0 }],
  termin: [{ label: "Termin I", persen: 100, pemicu: "Pelunasan" }],
  rab: { personil: 0, langsung: 0 },
  catatan: "",
};

export function SphBuilder({ existing }: { existing?: Sph }) {
  const [fs, setFs] = React.useState(false);
  const noSph = existing?.id ?? "SPH/006/6.2026";

  const form = useForm<SphFormValues>({
    // sphFormSchema uses z.coerce.number(), so the resolver's inferred input
    // type differs from SphFormValues (the output). Cast keeps SphForm's
    // UseFormReturn<SphFormValues> contract intact.
    resolver: zodResolver(sphFormSchema) as Resolver<SphFormValues>,
    defaultValues: existing
      ? {
          perusahaanId: existing.perusahaanId,
          perusahaanNama: existing.perusahaanNama,
          pic: existing.pic,
          alamat: existing.alamat,
          tanggal: existing.tanggal,
          masaBerlaku: existing.masaBerlaku,
          items: existing.items,
          termin: existing.termin,
          rab: existing.rab,
          catatan: existing.catatan,
        }
      : emptyValues,
  });

  const values = form.watch();

  const onSimpan = form.handleSubmit(() =>
    toast.success("Demo: draf tidak benar-benar disimpan"),
  );
  const onKirim = form.handleSubmit(() =>
    toast.success("Demo: SPH tidak benar-benar dikirim"),
  );

  return (
    <>
      <BuilderLayout
        title={existing ? existing.id : "Buat SPH"}
        subtitle="Susun Surat Penawaran Harga. Pratinjau diperbarui otomatis."
        actions={
          <>
            <Button variant="outline" onClick={() => setFs(true)}>
              <Maximize2 className="size-4" /> Pratinjau Layar Penuh
            </Button>
            <Button variant="secondary" onClick={onSimpan}>
              <Save className="size-4" /> Simpan Draf
            </Button>
            <Button onClick={onKirim}>
              <Send className="size-4" /> Kirim
            </Button>
          </>
        }
        form={
          <SphForm
            form={form}
            perusahaanOptions={perusahaanOptions}
            layananOptions={layananOptions}
          />
        }
        preview={
          <SphDocument values={values} noSph={noSph} status={existing?.status} />
        }
      />

      <Dialog open={fs} onOpenChange={setFs}>
        <DialogContent className="max-h-[95vh] max-w-3xl overflow-y-auto p-0">
          <DialogTitle className="sr-only">Pratinjau SPH</DialogTitle>
          <div className="bg-muted/40 p-4 sm:p-6">
            <SphDocument
              values={values}
              noSph={noSph}
              status={existing?.status}
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => toast.success("Demo: tidak diunduh")}
              >
                Unduh
              </Button>
              <Button
                onClick={() => {
                  setFs(false);
                  onKirim();
                }}
              >
                Kirim
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
