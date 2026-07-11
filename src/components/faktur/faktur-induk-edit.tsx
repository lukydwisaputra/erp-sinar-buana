"use client";
import * as React from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowLeft, Lock, Save } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { BuilderSection } from "@/components/shared/builder-layout";
import { DocumentBuilder } from "@/components/shared/document/document-builder";
import { ScaleToFit } from "@/components/shared/scale-to-fit";
import { DocumentFooter } from "@/components/shared/document/document-footer";
import { KirimDokumenDialog, type KirimTujuan } from "@/components/shared/document/kirim-dokumen-dialog";
import { MoneyInput } from "@/components/shared/money-input";
import { onFormInvalid } from "@/lib/form-toast";
import { useUpdateFakturInduk } from "@/lib/query/faktur";
import { useProyek } from "@/lib/query/proyek";
import { usePerusahaanList } from "@/lib/query/perusahaan";
import { FakturDocument } from "@/components/faktur/faktur-document";
import { updateFakturIndukSchema, type FakturInduk, type UpdateFakturIndukInput } from "@/lib/schemas/faktur";
import { statusVariant } from "@/components/faktur/faktur-induk-detail";

function tujuanOptionsFor(perusahaanOptions: { id: string; pic: { nama: string; jabatan: string; telepon: string; email: string }[] }[], perusahaanId: string): KirimTujuan[] {
  const p = perusahaanOptions.find((x) => x.id === perusahaanId);
  return p ? p.pic.map((pic) => ({ nama: pic.nama, jabatan: pic.jabatan, telepon: pic.telepon, email: pic.email })) : [];
}

/** Edit surface for a Faktur Induk — same billable-service/total-biaya/catatan
 * fields as the create form (FakturIndukCreate), plus a live per-termin
 * document preview (DocumentBuilder), matching the pre-Postgres prototype's
 * FakturBuilder ("form left, preview right, updates automatically"). Skema
 * Termin and Invoice Termin generation/status logic are untouched — this
 * only edits the Induk's own fields. */
export function FakturIndukEdit({ induk }: { induk: FakturInduk }) {
  const router = useRouter();
  const { data: proyek } = useProyek(induk.proyekId);
  const { data: perusahaanOptions = [] } = usePerusahaanList();
  const updateFakturInduk = useUpdateFakturInduk();
  const isIndukFinal = induk.statusSystemRole === "LUNAS" || induk.statusSystemRole === "BATAL";

  const [selectedTerminId, setSelectedTerminId] = React.useState(
    () => induk.termins[induk.termins.length - 1]?.id ?? "",
  );
  const selectedTermin = induk.termins.find((t) => t.id === selectedTerminId) ?? induk.termins[induk.termins.length - 1];
  const [kirimOpen, setKirimOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const form = useForm<UpdateFakturIndukInput>({
    resolver: zodResolver(updateFakturIndukSchema) as Resolver<UpdateFakturIndukInput>,
    defaultValues: {
      serviceIds: induk.layanan.map((l) => l.serviceId).filter((x): x is string => !!x),
      totalBiaya: induk.totalBiaya,
      notes: induk.notes || "",
    },
  });
  const { control, register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = form;
  const values = watch();

  const toggleService = (serviceId: string, checked: boolean) => {
    const next = checked
      ? [...values.serviceIds, serviceId]
      : values.serviceIds.filter((id) => id !== serviceId);
    setValue("serviceIds", next, { shouldValidate: true });
  };

  const layananOptions = proyek?.layanan ?? induk.layanan;

  const onSimpan = handleSubmit(async (data) => {
    await updateFakturInduk.mutateAsync({ id: induk.id, input: data });
    router.push(`/faktur/${encodeURIComponent(induk.id)}`);
  }, onFormInvalid);

  const onKirim = async () => {
    if (!selectedTermin) { toast.error("Belum ada Invoice Termin untuk dikirim."); return; }
    setKirimOpen(true);
  };

  const doc = selectedTermin
    ? <FakturDocument induk={induk} termin={selectedTermin} />
    : <div className="p-12 text-center text-sm text-muted-foreground">Belum ada Invoice Termin.</div>;

  return (
    <>
      <DocumentBuilder
        title={
          <span className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="size-7 -ml-2" onClick={() => router.push(`/faktur/${encodeURIComponent(induk.id)}`)}>
              <ArrowLeft className="size-4" />
            </Button>
            {induk.number ?? "—"}
            <Badge variant={statusVariant(induk.statusSystemRole)}>{induk.status}</Badge>
          </span>
        }
        subtitle="Ubah layanan, total biaya, dan catatan Faktur Induk. Pratinjau Invoice Termin diperbarui otomatis."
        previewTitle="Pratinjau Faktur"
        actions={
          !isIndukFinal && (
            <Button loading={isSubmitting} onClick={onSimpan}>
              <Save className="size-4" /> Simpan
            </Button>
          )
        }
        form={
          <div className="space-y-6">
            {isIndukFinal && (
              <Alert variant={induk.statusSystemRole === "LUNAS" ? "success" : "destructive"}>
                <Lock className="size-4" />
                <AlertTitle>Read Only</AlertTitle>
                <AlertDescription>
                  Faktur Induk ini sudah {induk.statusSystemRole === "LUNAS" ? "lunas" : "dibatalkan"} dan tidak dapat diubah.
                </AlertDescription>
              </Alert>
            )}

            <BuilderSection title="Layanan yang Ditagih">
              {layananOptions.length === 0 && <p className="text-sm text-muted-foreground">Proyek ini tidak memiliki layanan.</p>}
              <div className="space-y-2">
                {layananOptions.map((l, i) => {
                  const key = l.serviceId ?? `desc-${i}`;
                  const checked = l.serviceId ? values.serviceIds.includes(l.serviceId) : false;
                  return (
                    <label key={key} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={checked}
                        disabled={!l.serviceId || isIndukFinal}
                        onCheckedChange={(c) => l.serviceId && toggleService(l.serviceId, c === true)}
                      />
                      {l.nama}
                    </label>
                  );
                })}
              </div>
            </BuilderSection>

            <BuilderSection title="Total Biaya">
              <Field data-invalid={!!errors.totalBiaya}>
                <FieldLabel className="sr-only">Total Biaya</FieldLabel>
                <Controller
                  control={control}
                  name="totalBiaya"
                  render={({ field }) => (
                    <MoneyInput defaultValue={field.value} onValueChange={field.onChange} className="w-full" />
                  )}
                />
                <FieldError errors={errors.totalBiaya ? [{ message: errors.totalBiaya.message }] : undefined} />
              </Field>
            </BuilderSection>

            <BuilderSection title="Catatan">
              <Field>
                <FieldLabel className="sr-only">Catatan</FieldLabel>
                <Input {...register("notes")} placeholder="Catatan tambahan (opsional)" disabled={isIndukFinal} />
              </Field>
            </BuilderSection>

            {induk.termins.length > 0 && (
              <BuilderSection title="Pratinjau Termin" description="Pilih Invoice Termin untuk ditampilkan di pratinjau.">
                <Select value={selectedTerminId} onValueChange={setSelectedTerminId}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Pilih termin…" /></SelectTrigger>
                  <SelectContent>
                    {induk.termins.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.label} — {t.number ?? "Belum bernomor"}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </BuilderSection>
            )}
          </div>
        }
        sidePreview={<ScaleToFit>{doc}</ScaleToFit>}
        doc={doc}
        onKirim={onKirim}
      />

      {selectedTermin && (
        <KirimDokumenDialog
          open={kirimOpen}
          onOpenChange={setKirimOpen}
          jenisDokumen="faktur"
          dokumenId={selectedTermin.id}
          dokumenNomor={selectedTermin.number ?? selectedTermin.label}
          tujuanOptions={tujuanOptionsFor(perusahaanOptions, induk.perusahaanId)}
        />
      )}

      {mounted && selectedTermin && createPortal(
        <div className="doc-print hidden print:block">
          <FakturDocument induk={induk} termin={selectedTermin} />
          <div className="doc-print-footer" aria-hidden><DocumentFooter /></div>
        </div>,
        document.body,
      )}
    </>
  );
}
