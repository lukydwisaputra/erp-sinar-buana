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
import { SphCoverLetter } from "@/components/penawaran/sph-cover-letter";
import { SphDocumentPackage } from "@/components/penawaran/sph-document-package";
import { perusahaanFixtures } from "@/lib/fixtures/perusahaan";
import { katalogFixtures } from "@/lib/fixtures/katalog";
import { defaultItemRab, defaultItemJadwal } from "@/lib/sph-templates";
import {
  sphFormSchema,
  type SphFormValues,
  type Sph,
} from "@/lib/schemas/penawaran";

const perusahaanOptions: PerusahaanOption[] = perusahaanFixtures.map((p) => ({
  id: p.id,
  nama: p.nama,
  alamat: p.alamat,
}));

const layananOptions: LayananOption[] = katalogFixtures.map((l) => ({
  id: l.id,
  nama: l.nama,
  harga: l.hargaStandar ?? 0,
}));

const emptyValues: SphFormValues = {
  perusahaanId: "",
  perusahaanNama: "",
  alamat: "",
  tanggal: "",
  kalimatPembuka: "",
  lampiran: "RAB dan Estimasi Waktu",
  items: [
    {
      layananId: "",
      nama: "",
      volume: 1,
      harga: 0,
      satuan: "Paket",
      rab: defaultItemRab(),
      jadwal: defaultItemJadwal(""),
    },
  ],
  termin: [{ label: "Termin I", persen: 100, pemicu: "Pelunasan" }],
  catatan: [],
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
          alamat: existing.alamat,
          tanggal: existing.tanggal,
          kalimatPembuka: existing.kalimatPembuka,
          lampiran: existing.lampiran,
          items: existing.items,
          termin: existing.termin,
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
        preview={<SphCoverLetter values={values} noSph={noSph} />}
      />

      <Dialog open={fs} onOpenChange={setFs}>
        <DialogContent className="max-h-[95vh] max-w-3xl overflow-y-auto p-0">
          <DialogTitle className="sr-only">Pratinjau SPH</DialogTitle>
          <div className="bg-muted/40 p-4 sm:p-6">
            <SphDocumentPackage values={values} noSph={noSph} />
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setFs(false)}>
                Tutup
              </Button>
              <Button variant="outline" onClick={() => window.print()}>
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

      {/* Hidden print container — outside the Dialog so window.print() always
          emits the full package regardless of dialog state. */}
      <div className="sph-print hidden print:block">
        <SphDocumentPackage values={values} noSph={noSph} />
      </div>
    </>
  );
}
