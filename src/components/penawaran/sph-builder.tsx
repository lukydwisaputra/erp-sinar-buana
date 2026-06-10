"use client";

import * as React from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { delay } from "@/lib/data/_delay";
import { usePending } from "@/lib/use-pending";
import { Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DocumentBuilder } from "@/components/shared/document/document-builder";
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
  lampiran: "",
  rincianAktif: false,
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
  termin: [],
  catatan: [],
  ppnAktif: false,
  ppnPersen: 12,
  pph23Aktif: false,
  pph23Persen: 2,
};

export function SphBuilder({ existing }: { existing?: Sph }) {
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
          rincianAktif: existing.rincianAktif,
          items: existing.items,
          termin: existing.termin,
          catatan: existing.catatan,
          ppnAktif: existing.ppnAktif,
          ppnPersen: existing.ppnPersen,
          pph23Aktif: existing.pph23Aktif,
          pph23Persen: existing.pph23Persen,
        }
      : emptyValues,
  });

  const values = form.watch();

  const [saving, runSave] = usePending();
  const onSimpan = () =>
    runSave(
      form.handleSubmit(async () => {
        await delay();
        toast.success("Demo: draf tidak benar-benar disimpan");
      }),
    );
  const onKirim = form.handleSubmit(async () => {
    await delay();
    toast.success("Demo: SPH tidak benar-benar dikirim");
  });

  return (
    <DocumentBuilder
      title={existing ? existing.id : "Buat SPH"}
      subtitle="Susun Surat Penawaran Harga. Pratinjau diperbarui otomatis."
      previewTitle="Pratinjau SPH"
      actions={
        <Button variant="secondary" loading={saving} onClick={onSimpan}>
          <Save className="size-4" /> Simpan Draf
        </Button>
      }
      form={<SphForm form={form} perusahaanOptions={perusahaanOptions} layananOptions={layananOptions} />}
      sidePreview={<ScaleToFit><SphCoverLetter values={values} noSph={noSph} /></ScaleToFit>}
      doc={<SphDocumentPackage values={values} noSph={noSph} />}
      onKirim={onKirim}
    />
  );
}
