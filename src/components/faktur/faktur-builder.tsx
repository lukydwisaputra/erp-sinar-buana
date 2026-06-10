"use client";
import * as React from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScaleToFit } from "@/components/shared/scale-to-fit";
import { DocumentBuilder } from "@/components/shared/document/document-builder";
import { FakturForm } from "@/components/faktur/faktur-form";
import { FakturDocument } from "@/components/faktur/faktur-document";
import { fakturFormSchema, type FakturFormValues, type Faktur } from "@/lib/schemas/faktur";
import { usePending } from "@/lib/use-pending";
import { delay } from "@/lib/data/_delay";

function todayISO() { return new Date().toISOString().slice(0, 10); }
function plusDaysISO(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

const emptyValues: FakturFormValues = {
  sphId: "", perusahaanId: "", perusahaanNama: "", alamat: "", kota: "", npwp: "",
  tanggal: todayISO(), jatuhTempo: plusDaysISO(14),
  items: [{ uraian: "", volume: 1, harga: 0, satuan: "Paket" }],
  terminList: [{ label: "Termin I", persen: 100, pemicu: "Pelunasan" }],
  terminIndex: 0, ppnAktif: true, ppnPersen: 12, pph23Aktif: true, pph23Persen: 2,
  catatan: [], status: "draft", tanggalBayar: "",
};

export function FakturBuilder({ existing }: { existing?: Faktur }) {
  const noFaktur = existing?.id ?? "INV/???/????";
  const form = useForm<FakturFormValues>({
    resolver: zodResolver(fakturFormSchema) as Resolver<FakturFormValues>,
    defaultValues: existing ? { ...existing } : emptyValues,
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
    toast.success("Demo: faktur tidak benar-benar dikirim");
  });

  return (
    <DocumentBuilder
      title={existing ? existing.id : "Faktur"}
      subtitle="Susun Faktur per termin. Pratinjau diperbarui otomatis."
      previewTitle="Pratinjau Faktur"
      actions={
        <Button variant="secondary" loading={saving} onClick={onSimpan}>
          <Save className="size-4" /> Simpan Draf
        </Button>
      }
      form={<FakturForm form={form} />}
      sidePreview={<ScaleToFit><FakturDocument values={values} noFaktur={noFaktur} /></ScaleToFit>}
      doc={<FakturDocument values={values} noFaktur={noFaktur} />}
      onKirim={onKirim}
    />
  );
}
