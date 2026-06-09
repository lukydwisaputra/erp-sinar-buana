"use client";

import * as React from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Download, Maximize2, Save, Send, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { BuilderLayout } from "@/components/shared/builder-layout";
import { ScaleToFit } from "@/components/shared/scale-to-fit";
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
  masaBerlakuAktif: false,
  masaBerlakuHari: 30,
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
  termin: [{ label: "Termin I", persen: 0, pemicu: "" }],
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
          masaBerlakuAktif: existing.masaBerlakuAktif,
          masaBerlakuHari: existing.masaBerlakuHari,
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
          <ScaleToFit>
            <SphCoverLetter values={values} noSph={noSph} />
          </ScaleToFit>
        }
      />

      <Dialog open={fs} onOpenChange={setFs}>
        <DialogContent
          showCloseButton={false}
          className="flex h-[92vh] w-[92vw] flex-col overflow-hidden p-0 !max-w-[92vw]"
        >
          <DialogTitle className="sr-only">Pratinjau SPH</DialogTitle>
          {/* Toolbar lives inside the preview content (not the modal corner). */}
          <div className="flex shrink-0 items-center justify-end gap-2 border-b border-border bg-background px-4 py-2">
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Download className="size-4" /> Unduh
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setFs(false);
                onKirim();
              }}
            >
              <Send className="size-4" /> Kirim
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Tutup"
              onClick={() => setFs(false)}
            >
              <X className="size-4" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto bg-muted/40 p-4 sm:p-6">
            <div className="mx-auto max-w-[210mm]">
              <ScaleToFit>
                <SphDocumentPackage values={values} noSph={noSph} />
              </ScaleToFit>
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
