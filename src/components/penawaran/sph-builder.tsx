"use client";

import * as React from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { delay } from "@/lib/data/_delay";
import { usePending } from "@/lib/use-pending";
import { createPortal } from "react-dom";
import { Download, Lock, Save, Send, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { DocumentBuilder } from "@/components/shared/document/document-builder";
import { DocumentFooter } from "@/components/shared/document/document-footer";
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
  type SphStatus,
} from "@/lib/schemas/penawaran";

const SPH_STATUS: Record<SphStatus, { label: string; variant: "info" | "warning" | "success" | "destructive" | "secondary" }> = {
  draft:      { label: "Draf",       variant: "info" },
  terkirim:   { label: "Terkirim",   variant: "warning" },
  deal:       { label: "Disetujui",  variant: "success" },
  ditolak:    { label: "Ditolak",    variant: "destructive" },
  dibatalkan: { label: "Dibatalkan", variant: "secondary" },
};

function StatusBadge({ status }: { status: SphStatus }) {
  const s = SPH_STATUS[status];
  return <Badge variant={s.variant}>{s.label}</Badge>;
}
import { useSph } from "@/lib/query/penawaran";

const perusahaanOptions: PerusahaanOption[] = perusahaanFixtures.map((p) => ({
  id: p.id,
  nama: p.nama,
  alamat: p.alamat,
  pic: p.pic,
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
  jabatanPenerima: "Direktur",
  picAktif: false,
  picNama: "",
  picJabatan: "",
  kelengkapan: [],
};

function sphToFormValues(existing: Sph): SphFormValues {
  return {
    perusahaanId:     existing.perusahaanId,
    perusahaanNama:   existing.perusahaanNama,
    alamat:           existing.alamat,
    tanggal:          existing.tanggal,
    masaBerlakuAktif: existing.masaBerlakuAktif,
    masaBerlakuHari:  existing.masaBerlakuHari,
    kalimatPembuka:   existing.kalimatPembuka,
    lampiran:         existing.lampiran,
    rincianAktif:     existing.rincianAktif,
    items:            existing.items,
    termin:           existing.termin,
    catatan:          existing.catatan,
    ppnAktif:         existing.ppnAktif,
    ppnPersen:        existing.ppnPersen,
    pph23Aktif:       existing.pph23Aktif,
    pph23Persen:      existing.pph23Persen,
    jabatanPenerima:  existing.jabatanPenerima,
    picAktif:         existing.picAktif,
    picNama:          existing.picNama,
    picJabatan:       existing.picJabatan,
    kelengkapan:      existing.kelengkapan ?? [],
  };
}

function SphHeaderBar({ noSph, status }: { noSph: string; status: SphStatus }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-semibold">{noSph}</span>
      <StatusBadge status={status} />
    </div>
  );
}

function SphDealView({ existing, noSph }: { existing: Sph; noSph: string }) {
  const [mounted, setMounted] = React.useState(false);
  const [sending, runSend] = usePending();
  React.useEffect(() => setMounted(true), []);

  const values = sphToFormValues(existing);

  const onKirim = async () => {
    await delay();
    toast.success("Demo: SPH tidak benar-benar dikirim");
  };

  return (
    <>
      <div className="space-y-4">
        <Alert>
          <Lock className="size-4" />
          <AlertTitle>Read Only</AlertTitle>
          <AlertDescription>
            Penawaran ini sudah menjadi Deal dan tidak dapat diubah.
          </AlertDescription>
        </Alert>
        <div className="overflow-hidden rounded-lg border border-border">
          <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-3">
            <SphHeaderBar noSph={noSph} status={existing.status} />
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Download className="size-4" /> Unduh
              </Button>
              <Button size="sm" loading={sending} onClick={() => runSend(onKirim)}>
                <Send className="size-4" /> Kirim
              </Button>
            </div>
          </div>
          <div className="p-4">
            <div className="mx-auto max-w-[794px]">
              <ScaleToFit>
                <SphCoverLetter values={values} noSph={noSph} />
              </ScaleToFit>
            </div>
          </div>
        </div>
      </div>

      {mounted && createPortal(
        <div className="doc-print hidden print:block">
          <SphDocumentPackage values={values} noSph={noSph} />
          <div className="doc-print-footer" aria-hidden>
            <DocumentFooter />
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

function SphCancelledView({ existing, noSph }: { existing: Sph; noSph: string }) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const values = sphToFormValues(existing);
  const isDitolak = existing.status === "ditolak";

  return (
    <>
      <div className="space-y-4">
        <Alert variant="destructive">
          <XCircle className="size-4" />
          <AlertTitle>{isDitolak ? "Ditolak" : "Dibatalkan"}</AlertTitle>
          <AlertDescription>
            {isDitolak
              ? "Penawaran ini telah ditolak dan tidak dapat diubah."
              : "Penawaran ini telah dibatalkan dan tidak dapat diubah."}
          </AlertDescription>
        </Alert>
        <div className="overflow-hidden rounded-lg border border-border">
          <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-3">
            <SphHeaderBar noSph={noSph} status={existing.status} />
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Download className="size-4" /> Unduh
            </Button>
          </div>
          <div className="p-4">
            <div className="mx-auto max-w-[794px]">
              <ScaleToFit>
                <SphCoverLetter values={values} noSph={noSph} />
              </ScaleToFit>
            </div>
          </div>
        </div>
      </div>

      {mounted && createPortal(
        <div className="doc-print hidden print:block">
          <SphDocumentPackage values={values} noSph={noSph} />
          <div className="doc-print-footer" aria-hidden>
            <DocumentFooter />
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

function SphEditView({ existing, noSph }: { existing?: Sph; noSph: string }) {
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
          jabatanPenerima: existing.jabatanPenerima,
          picAktif: existing.picAktif,
          picNama: existing.picNama,
          picJabatan: existing.picJabatan,
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
      title={
        existing ? (
          <span className="flex items-center gap-2">
            {existing.id}
            <StatusBadge status={existing.status} />
          </span>
        ) : "Buat SPH"
      }
      subtitle="Susun Surat Penawaran Harga. Pratinjau diperbarui otomatis."
      previewTitle="Pratinjau SPH"
      actions={
        <Button variant="secondary" loading={saving} onClick={onSimpan}>
          <Save className="size-4" /> Simpan
        </Button>
      }
      form={<SphForm form={form} perusahaanOptions={perusahaanOptions} layananOptions={layananOptions} />}
      sidePreview={<ScaleToFit><SphCoverLetter values={values} noSph={noSph} /></ScaleToFit>}
      doc={<SphDocumentPackage values={values} noSph={noSph} />}
      onKirim={onKirim}
    />
  );
}

export function SphBuilder({ existing }: { existing?: Sph }) {
  const { data: live } = useSph(existing?.id ?? "", existing);
  const sph = live ?? existing;
  const noSph = sph?.id ?? "SPH/006/6.2026";
  const status = sph?.status;

  if (sph && status === "deal") {
    return <SphDealView existing={sph} noSph={noSph} />;
  }

  if (sph && (status === "dibatalkan" || status === "ditolak")) {
    return <SphCancelledView existing={sph} noSph={noSph} />;
  }

  return <SphEditView existing={sph} noSph={noSph} />;
}
