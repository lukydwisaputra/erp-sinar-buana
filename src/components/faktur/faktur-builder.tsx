"use client";
import * as React from "react";
import { createPortal } from "react-dom";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Ban, Download, Lock, Save, Send, XCircle } from "lucide-react";
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
import { fakturFormSchema, type FakturFormValues, type Faktur } from "@/lib/schemas/faktur";
import { companyProfile } from "@/lib/company-profile";
import { perusahaanFixtures } from "@/lib/fixtures/perusahaan";
import { usePending } from "@/lib/use-pending";
import { delay } from "@/lib/data/_delay";
import { useCancelFaktur } from "@/lib/query/faktur";

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
  const [sending, runSend] = usePending();
  React.useEffect(() => setMounted(true), []);

  const noFaktur = existing.id;
  const values: FakturFormValues = { ...existing };
  const isLunas = existing.status === "lunas";

  const onKirim = async () => {
    await delay();
    toast.success("Demo: faktur tidak benar-benar dikirim");
  };

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
            <p className="text-sm font-semibold">{noFaktur} — Pratinjau Faktur</p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Download className="size-4" /> Unduh
              </Button>
              {isLunas && (
                <Button size="sm" loading={sending} onClick={() => runSend(onKirim)}>
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
  const router = useRouter();
  const cancelFaktur = useCancelFaktur();

  const noFaktur = existing?.id ?? "INV/???/????";
  const picOptions = perusahaanFixtures.find((p) => p.id === (existing?.perusahaanId ?? ""))?.pic ?? [];
  const form = useForm<FakturFormValues>({
    resolver: zodResolver(fakturFormSchema) as Resolver<FakturFormValues>,
    defaultValues: existing ? { ...existing } : emptyValues,
  });
  const values = form.watch();
  const [saving, runSave] = usePending();
  const [cancelOpen, setCancelOpen] = React.useState(false);

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
    <>
      <DocumentBuilder
        title={existing ? existing.id : "Faktur"}
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
              <Save className="size-4" /> Simpan Draf
            </Button>
          </>
        }
        form={<FakturForm form={form} picOptions={picOptions} />}
        sidePreview={<ScaleToFit><FakturDocument values={values} noFaktur={noFaktur} /></ScaleToFit>}
        doc={<FakturDocument values={values} noFaktur={noFaktur} />}
        onKirim={onKirim}
      />

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
              onClick={() => {
                if (!existing) return;
                cancelFaktur.mutate(
                  { fakturId: existing.id, sphId: existing.sphId },
                  {
                    onSuccess: () => {
                      toast.success("Faktur berhasil dibatalkan.");
                      setCancelOpen(false);
                      router.refresh();
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
  if (existing && (existing.status === "lunas" || existing.status === "dibatalkan")) {
    return <FakturReadOnlyView existing={existing} />;
  }
  return <FakturEditView existing={existing} />;
}
