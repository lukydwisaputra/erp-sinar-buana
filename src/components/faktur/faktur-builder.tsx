"use client";
import * as React from "react";
import { createPortal } from "react-dom";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Ban, Download, Lock, Save, Send, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScaleToFit } from "@/components/shared/scale-to-fit";
import { DocumentBuilder } from "@/components/shared/document/document-builder";
import { DocumentFooter } from "@/components/shared/document/document-footer";
import { FakturForm } from "@/components/faktur/faktur-form";
import { FakturDocument } from "@/components/faktur/faktur-document";
import { KirimDokumenDialog, type KirimTujuan } from "@/components/shared/document/kirim-dokumen-dialog";
import { fakturFormSchema, type FakturFormValues, type Faktur } from "@/lib/schemas/faktur";
import { isFakturOverdue } from "@/lib/faktur";

function tujuanOptionsFor(perusahaanId: string): KirimTujuan[] {
  const p = perusahaanFixtures.find((x) => x.id === perusahaanId);
  if (!p) return [];
  if (p.pic.length > 0) {
    return p.pic.map((pic) => ({ nama: pic.nama, jabatan: pic.jabatan, telepon: pic.telepon, email: pic.email }));
  }
  return [{ nama: p.nama, telepon: p.telepon, email: p.email }];
}

type BadgeVariant = "info" | "warning" | "success" | "secondary" | "destructive";

function fakturBadge(f: Faktur): { label: string; variant: BadgeVariant } {
  if (f.status === "lunas")      return { label: "Lunas",       variant: "success" };
  if (f.status === "dibatalkan") return { label: "Dibatalkan",  variant: "secondary" };
  if (f.status === "draft")      return { label: "Draf",        variant: "info" };
  // terkirim — check overdue first
  if (isFakturOverdue(f))        return { label: "Jatuh Tempo", variant: "destructive" };
  return { label: "Belum Lunas", variant: "warning" };
}
import { companyProfile } from "@/lib/company-profile";
import { perusahaanFixtures } from "@/lib/fixtures/perusahaan";
import { usePending } from "@/lib/use-pending";
import { onFormInvalid } from "@/lib/form-toast";
import { useCancelFaktur, useFaktur, useUpdateFaktur } from "@/lib/query/faktur";
import { useTarifConfig } from "@/lib/query/tarif-config";

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
  bankNama: companyProfile.bank.nama,
  bankAtasNama: companyProfile.bank.atasNama,
  bankNoRekening: companyProfile.bank.noRekening,
  jabatanPenerima: "Direktur",
  picAktif: false,
  picNama: "",
  picJabatan: "",
};

// ─── Read-only view (lunas or dibatalkan) ────────────────────────────────────

function FakturReadOnlyView({ existing }: { existing: Faktur }) {
  const [mounted, setMounted] = React.useState(false);
  const [kirimOpen, setKirimOpen] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const noFaktur = existing.id;
  const values: FakturFormValues = { ...existing };
  const isLunas = existing.status === "lunas";

  return (
    <>
      <div className="space-y-4">
        {isLunas ? (
          <Alert variant="success">
            <Lock className="size-4" />
            <AlertTitle>Read Only</AlertTitle>
            <AlertDescription>Faktur ini sudah lunas dan tidak dapat diubah.</AlertDescription>
          </Alert>
        ) : (
          <Alert variant="destructive">
            <XCircle className="size-4" />
            <AlertTitle>Dibatalkan</AlertTitle>
            <AlertDescription>Faktur ini telah dibatalkan dan tidak dapat diubah.</AlertDescription>
          </Alert>
        )}

        <div className="overflow-hidden rounded-lg border border-border">
          <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">{noFaktur}</span>
              {(() => { const b = fakturBadge(existing); return <Badge variant={b.variant} className="text-xs">{b.label}</Badge>; })()}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Download className="size-4" /> Unduh
              </Button>
              {isLunas && (
                <Button size="sm" onClick={() => setKirimOpen(true)}>
                  <Send className="size-4" /> Kirim
                </Button>
              )}
            </div>
          </div>
          <div className="p-4">
            <div className="mx-auto max-w-[794px]">
              <ScaleToFit>
                <FakturDocument values={values} noFaktur={noFaktur} />
              </ScaleToFit>
            </div>
          </div>
        </div>
      </div>

      <KirimDokumenDialog
        open={kirimOpen}
        onOpenChange={setKirimOpen}
        jenisDokumen="faktur"
        dokumenId={existing.id}
        dokumenNomor={noFaktur}
        tujuanOptions={tujuanOptionsFor(existing.perusahaanId)}
      />

      {mounted && createPortal(
        <div className="doc-print hidden print:block">
          <FakturDocument values={values} noFaktur={noFaktur} />
          <div className="doc-print-footer" aria-hidden>
            <DocumentFooter />
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

// ─── Editable builder ────────────────────────────────────────────────────────

function FakturEditView({ existing }: { existing?: Faktur }) {
  const cancelFaktur = useCancelFaktur();
  const updateFaktur = useUpdateFaktur();
  const { data: tarif } = useTarifConfig();

  const noFaktur = existing?.id ?? "INV/???/????";
  const picOptions = perusahaanFixtures.find((p) => p.id === (existing?.perusahaanId ?? ""))?.pic ?? [];
  const form = useForm<FakturFormValues>({
    resolver: zodResolver(fakturFormSchema) as Resolver<FakturFormValues>,
    defaultValues: existing ? { ...existing } : emptyValues,
  });

  // New-faktur only: once Konfigurasi's tarif defaults load, refresh the still-untouched
  // rate/PKP/due-date fields. Never applies when editing an existing faktur — changing
  // tarif defaults is not retroactive. Guarded to run once so it can't clobber user edits.
  const appliedTarifDefaults = React.useRef(false);
  React.useEffect(() => {
    if (existing || !tarif || appliedTarifDefaults.current) return;
    appliedTarifDefaults.current = true;
    form.setValue("ppnPersen", tarif.ppnPersenDefault);
    form.setValue("pph23Persen", tarif.pph23PersenDefault);
    form.setValue("ppnAktif", tarif.statusPkp);
    const d = new Date();
    d.setDate(d.getDate() + tarif.jatuhTempoFakturHari);
    form.setValue("jatuhTempo", d.toISOString().slice(0, 10));
  }, [existing, tarif, form]);

  const values = form.watch();
  const [saving, runSave] = usePending();
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [kirimOpen, setKirimOpen] = React.useState(false);

  const onSimpan = () =>
    runSave(
      form.handleSubmit(async (data) => {
        if (!existing) {
          toast.success("Demo: draf tidak benar-benar disimpan");
          return;
        }
        await updateFaktur.mutateAsync({ id: existing.id, patch: data });
        toast.success("Faktur berhasil disimpan");
      }, onFormInvalid),
    );
  const onKirim = form.handleSubmit(async () => {
    if (!existing) {
      toast.success("Demo: faktur tidak benar-benar dikirim");
      return;
    }
    setKirimOpen(true);
  }, onFormInvalid);
  const onSentKirim = async () => {
    if (!existing) return;
    await updateFaktur.mutateAsync({ id: existing.id, patch: { ...values, status: "terkirim" } });
    form.setValue("status", "terkirim");
    toast.success("Faktur berhasil dikirim");
  };

  return (
    <>
      <DocumentBuilder
        title={
          existing ? (
            <span className="flex items-center gap-2">
              {existing.id}
              {(() => { const b = fakturBadge(existing); return <Badge variant={b.variant} className="text-xs">{b.label}</Badge>; })()}
            </span>
          ) : "Faktur"
        }
        subtitle="Susun Faktur per termin. Pratinjau diperbarui otomatis."
        previewTitle="Pratinjau Faktur"
        actions={
          <>
            {existing && (
              <Button variant="destructive" size="sm" onClick={() => setCancelOpen(true)}>
                <Ban className="size-4" /> Batalkan
              </Button>
            )}
            <Button variant="secondary" loading={saving} onClick={onSimpan}>
              <Save className="size-4" /> Simpan
            </Button>
          </>
        }
        form={<FakturForm form={form} picOptions={picOptions} />}
        sidePreview={<ScaleToFit><FakturDocument values={values} noFaktur={noFaktur} /></ScaleToFit>}
        doc={<FakturDocument values={values} noFaktur={noFaktur} />}
        onKirim={onKirim}
      />

      {existing && (
        <KirimDokumenDialog
          open={kirimOpen}
          onOpenChange={setKirimOpen}
          jenisDokumen="faktur"
          dokumenId={existing.id}
          dokumenNomor={noFaktur}
          tujuanOptions={tujuanOptionsFor(values.perusahaanId)}
          onSent={onSentKirim}
        />
      )}

      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Batalkan faktur ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Faktur dan penawaran terkait akan berubah status menjadi Dibatalkan.
              Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Kembali</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={cancelFaktur.isPending}
              onClick={() => {
                if (!existing) return;
                cancelFaktur.mutate(
                  { fakturId: existing.id, sphId: existing.sphId },
                  {
                    onSuccess: () => {
                      toast.success("Faktur berhasil dibatalkan.");
                      setCancelOpen(false);
                    },
                  },
                );
              }}
            >
              Ya, Batalkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─── Public entry point ───────────────────────────────────────────────────────

export function FakturBuilder({ existing }: { existing?: Faktur }) {
  const { data: live } = useFaktur(existing?.id ?? "", existing);
  const faktur = live ?? existing;
  const status = faktur?.status;

  if (faktur && (status === "lunas" || status === "dibatalkan")) {
    return <FakturReadOnlyView existing={faktur} />;
  }
  return <FakturEditView existing={faktur} />;
}
