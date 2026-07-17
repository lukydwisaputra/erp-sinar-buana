"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { usePending } from "@/lib/use-pending";
import { Download, Lock, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { DocumentBuilder } from "@/components/shared/document/document-builder";
import { StatusBadge, type StatusBadgeConfig } from "@/components/shared/status-badge";
import { ScaleToFit } from "@/components/shared/scale-to-fit";
import {
  SphForm,
  type PerusahaanOption,
  type LayananOption,
} from "@/components/penawaran/sph-form";
import { SphCoverLetter } from "@/components/penawaran/sph-cover-letter";
import { SphDocumentPackage } from "@/components/penawaran/sph-document-package";
import { KirimDokumenDialog, type KirimTujuan } from "@/components/shared/document/kirim-dokumen-dialog";
import { CancelPembatalanModal } from "@/components/shared/cancel-pembatalan-modal";
import { useCancelPembatalan } from "@/lib/query/pembatalan";
import { defaultItemRab, defaultItemJadwal } from "@/lib/sph-templates";
import { onFormInvalid } from "@/lib/form-toast";
import { usePerusahaanList } from "@/lib/query/perusahaan";
import { useKatalogList } from "@/lib/query/katalog";
import { useSignatureTemplateList } from "@/lib/query/signature-templates";
import {
  sphFormSchema,
  type SphFormValues,
  type Sph,
  type SphStatus,
} from "@/lib/schemas/penawaran";

function tujuanOptionsFor(perusahaanOptions: PerusahaanOption[], perusahaanId: string): KirimTujuan[] {
  const p = perusahaanOptions.find((x) => x.id === perusahaanId);
  if (!p) return [];
  return p.pic.map((pic) => ({ nama: pic.nama, jabatan: pic.jabatan, telepon: pic.telepon, email: pic.email }));
}

const SPH_STATUS: Record<SphStatus, StatusBadgeConfig> = {
  draft:      { label: "Draf",       variant: "info" },
  terkirim:   { label: "Terkirim",   variant: "warning" },
  deal:       { label: "Disetujui",  variant: "success" },
  ditolak:    { label: "Ditolak",    variant: "destructive" },
  dibatalkan: { label: "Dibatalkan", variant: "secondary" },
};
import { useSph, useCreatePenawaran, useUpdatePenawaran, useUpdatePenawaranStatus } from "@/lib/query/penawaran";
import { useSession } from "@/lib/query/session";
import { useTaxSettings } from "@/lib/query/tax-settings";
import { isClientPortal, isAdminUser } from "@/lib/auth/rbac";

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
  salutasiPenerima: "bapak_ibu",
  tempat: "",
  picAktif: false,
  picNama: "",
  picJabatan: "",
  picSalutation: "bapak_ibu",
  kelengkapan: [],
  useDigitalSignature: false,
  signatureTemplateId: null,
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
    salutasiPenerima: existing.salutasiPenerima,
    tempat:           existing.tempat,
    picAktif:         existing.picAktif,
    picNama:          existing.picNama,
    picJabatan:       existing.picJabatan,
    picSalutation:    existing.picSalutation,
    kelengkapan:      existing.kelengkapan ?? [],
    useDigitalSignature: existing.useDigitalSignature,
    signatureTemplateId: existing.signatureTemplateId,
  };
}

function SphHeaderBar({ noSph, status }: { noSph: string; status: SphStatus }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-semibold">{noSph}</span>
      <StatusBadge status={status} map={SPH_STATUS} />
    </div>
  );
}

/** Client portal — always read-only regardless of status (a draft/terkirim
 * SPH the client can see is still not theirs to edit). Generic copy, no
 * "Kirim" button (a client has no one to send their own SPH to). */
function SphClientView({ existing, noSph }: { existing: Sph; noSph: string }) {
  const values = sphToFormValues(existing);
  return (
    <div className="space-y-4">
      <Alert>
        <Lock className="size-4" />
        <AlertTitle>Hanya Lihat</AlertTitle>
        <AlertDescription>Penawaran ini ditampilkan untuk dilihat saja.</AlertDescription>
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
              <SphCoverLetter values={values} noSph={noSph} signatureImage={existing.signatureImage} />
            </ScaleToFit>
          </div>
        </div>
      </div>
    </div>
  );
}

function SphEditView({ existing, noSph }: { existing?: Sph; noSph: string }) {
  const { data: session } = useSession();
  const isAdmin = isAdminUser(session);
  const { data: tarif } = useTaxSettings();
  const { data: perusahaanOptions = [] } = usePerusahaanList();
  const { data: katalogData = [] } = useKatalogList();
  const layananOptions: LayananOption[] = katalogData.map((l) => ({
    id: l.id,
    nama: l.nama,
    harga: l.hargaStandar ?? 0,
  }));
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
          salutasiPenerima: existing.salutasiPenerima,
          tempat: existing.tempat,
          picAktif: existing.picAktif,
          picNama: existing.picNama,
          picJabatan: existing.picJabatan,
          picSalutation: existing.picSalutation,
          kelengkapan: existing.kelengkapan,
          useDigitalSignature: existing.useDigitalSignature,
          signatureTemplateId: existing.signatureTemplateId,
        }
      : emptyValues,
  });

  // New-SPH only: once Konfigurasi's tarif defaults load, refresh the still-untouched
  // rate fields. Never applies to `existing` (editing) SPH — changing tarif defaults
  // is not retroactive. Guarded to run once so it can't clobber user edits.
  const appliedTarifDefaults = React.useRef(false);
  React.useEffect(() => {
    if (existing || !tarif || appliedTarifDefaults.current) return;
    appliedTarifDefaults.current = true;
    form.setValue("ppnPersen", tarif.ppnRate);
    form.setValue("pph23Persen", tarif.pph23Rate);
    form.setValue("masaBerlakuHari", tarif.quotationValidityDays);
  }, [existing, tarif, form]);

  const values = form.watch();
  const { data: signatureTemplates = [] } = useSignatureTemplateList();
  const signatureImage = values.useDigitalSignature
    ? signatureTemplates.find((s) => s.id === values.signatureTemplateId)?.signatureImage ?? null
    : null;

  const router = useRouter();
  const [saving, runSave] = usePending();
  const [kirimOpen, setKirimOpen] = React.useState(false);
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const cancelPembatalan = useCancelPembatalan();
  const updateStatus = useUpdatePenawaranStatus();
  const createSph = useCreatePenawaran();
  const updateSph = useUpdatePenawaran();
  const onSimpan = () =>
    runSave(
      form.handleSubmit(async (formValues) => {
        if (existing) {
          await updateSph.mutateAsync({ id: existing.id, input: formValues });
          return;
        }
        const created = await createSph.mutateAsync({ ...formValues, status: "draft" });
        router.push(`/penawaran/${created.id}`);
      }, onFormInvalid),
    );
  const onKirim = form.handleSubmit(async (formValues) => {
    if (!existing) {
      const created = await createSph.mutateAsync({ ...formValues, status: "terkirim" });
      toast.success("Penawaran dibuat dan ditandai terkirim.");
      router.push(`/penawaran/${created.id}`);
      return;
    }
    setKirimOpen(true);
  }, onFormInvalid);

  return (
    <>
      <DocumentBuilder
        title={
          existing ? (
            <span className="flex items-center gap-2">
              {noSph}
              <StatusBadge status={existing.status} map={SPH_STATUS} />
            </span>
          ) : "Buat SPH"
        }
        subtitle="Susun Surat Penawaran Harga. Pratinjau diperbarui otomatis."
        previewTitle="Pratinjau SPH"
        actions={
          <>
            {existing && existing.status !== "dibatalkan" && isAdmin && (
              <Button variant="destructive" onClick={() => setCancelOpen(true)}>Batalkan</Button>
            )}
            <Button variant="secondary" loading={saving} onClick={onSimpan}>
              <Save className="size-4" /> Simpan
            </Button>
          </>
        }
        form={<SphForm form={form} perusahaanOptions={perusahaanOptions} layananOptions={layananOptions} />}
        sidePreview={<ScaleToFit><SphCoverLetter values={values} noSph={noSph} signatureImage={signatureImage} /></ScaleToFit>}
        doc={<SphDocumentPackage values={values} noSph={noSph} signatureImage={signatureImage} />}
        onKirim={onKirim}
      />

      {existing && (
        <KirimDokumenDialog
          open={kirimOpen}
          onOpenChange={setKirimOpen}
          jenisDokumen="sph"
          dokumenId={existing.id}
          dokumenNomor={noSph}
          tujuanOptions={tujuanOptionsFor(perusahaanOptions, values.perusahaanId)}
          onSent={() => {
            if (existing.status === "draft") {
              updateStatus.mutate({ id: existing.id, status: "terkirim" });
            }
          }}
        />
      )}

      {existing && (
        <CancelPembatalanModal
          open={cancelOpen}
          onOpenChange={setCancelOpen}
          isPending={cancelPembatalan.isPending}
          onConfirm={({ alasan, biayaAdministrasi }) => {
            cancelPembatalan.mutate(
              { sphId: existing.id, alasan, biayaAdministrasi },
              { onSuccess: () => setCancelOpen(false) },
            );
          }}
        />
      )}
    </>
  );
}

export function SphBuilder({ existing }: { existing?: Sph }) {
  const { data: live } = useSph(existing?.id ?? "", existing);
  const { data: session } = useSession();
  const sph = live ?? existing;
  const noSph = sph?.number ?? "Draf Baru";

  // Client portal — always read-only, regardless of status (an RBAC
  // restriction, not a status one — a client-linked Viewer never edits their
  // own SPH). Every other status stays on the editable form: nothing is
  // read-only because of status anymore (Pembatalan Penawaran client
  // request) — Deal/Ditolak/Dibatalkan SPH can all still be adjusted.
  if (sph && isClientPortal(session)) {
    return <SphClientView existing={sph} noSph={noSph} />;
  }

  return <SphEditView existing={sph} noSph={noSph} />;
}
