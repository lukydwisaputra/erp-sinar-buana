"use client";

import * as React from "react";
import type { UseFormReturn } from "react-hook-form";
import { SlidersHorizontal } from "lucide-react";

import type { SphFormValues } from "@/lib/schemas/penawaran";
import { BuilderSection } from "@/components/shared/builder-layout";
import { LineItemEditor, type ServiceOption } from "@/components/shared/line-item-editor";
import { ServiceRabJadwalEditor } from "@/components/penawaran/service-rab-jadwal-editor";
import { totalPenawaran, defaultKalimatPembuka } from "@/lib/sph";
import { formatRupiah } from "@/lib/format";
import { terbilang } from "@/lib/terbilang";

import { TujuanSection, type PerusahaanOption } from "@/components/penawaran/sph-form-tujuan-section";
import { KelengkapanSection } from "@/components/penawaran/sph-form-kelengkapan-section";
import { TerminEditor } from "@/components/penawaran/sph-form-termin-editor";
import { MasaBerlakuField, CatatanEditor, PajakRow } from "@/components/penawaran/sph-form-fields";

import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSignatureTemplateList } from "@/lib/query/signature-templates";

// Re-exported — sph-builder.tsx imports both from this file's original
// location; kept stable rather than touching every call site.
export type { PerusahaanOption };
export type LayananOption = { id: string; nama: string; harga: number };

const err = (e: { message?: string } | undefined) => (e ? [e] : undefined);

export function SphForm({
  form,
  perusahaanOptions,
  layananOptions,
}: {
  form: UseFormReturn<SphFormValues>;
  perusahaanOptions: PerusahaanOption[];
  layananOptions: LayananOption[];
}): React.JSX.Element {
  const values = form.watch();
  const { data: signatureTemplates = [] } = useSignatureTemplateList();

  // Auto-generate Kalimat Pembuka from the picked service names — keeps
  // regenerating as items change, but only while the field still matches the
  // last value THIS effect wrote; once the user edits it by hand, it's left
  // alone (never overwrites a manual edit).
  const lastGenerated = React.useRef("");
  const namaLayanan = values.items.map((it) => it.nama).filter(Boolean).join("|");
  React.useEffect(() => {
    const generated = defaultKalimatPembuka(namaLayanan ? namaLayanan.split("|") : []);
    const current = form.getValues("kalimatPembuka");
    if (generated && (current === "" || current === lastGenerated.current)) {
      form.setValue("kalimatPembuka", generated);
    }
    lastGenerated.current = generated;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [namaLayanan]);

  return (
    <div className="space-y-6">
      <TujuanSection form={form} perusahaanOptions={perusahaanOptions} />

      <BuilderSection title="Naskah Dokumen">
        <Field>
          <FieldLabel>Kalimat Pembuka</FieldLabel>
          <Textarea
            rows={3}
            placeholder="Sehubungan dengan adanya permintaan untuk…"
            {...form.register("kalimatPembuka")}
          />
        </Field>
      </BuilderSection>

      <BuilderSection title="Baris Layanan">
        <label className="mb-4 flex items-center gap-2 border-b border-border pb-4 text-sm">
          <Checkbox
            checked={values.rincianAktif}
            onCheckedChange={(c) => form.setValue("rincianAktif", c === true)}
          />
          Kelola RAB &amp; Estimasi Waktu (sertakan sebagai lampiran)
        </label>

        <LineItemEditor
          items={values.items}
          options={layananOptions as ServiceOption[]}
          onChange={(v) => form.setValue("items", v, { shouldValidate: true })}
          renderRowExtra={
            values.rincianAktif
              ? (it, i, update) => (
                  <ServiceRabJadwalEditor
                    serviceName={it.nama}
                    rab={it.rab}
                    jadwal={it.jadwal}
                    previous={
                      i > 0
                        ? { rab: values.items[i - 1].rab, jadwal: values.items[i - 1].jadwal }
                        : undefined
                    }
                    onChange={(patch) => update(i, patch)}
                    trigger={
                      <Button type="button" variant="outline" size="sm">
                        <SlidersHorizontal className="size-4" /> RAB &amp; Jadwal
                      </Button>
                    }
                  />
                )
              : undefined
          }
        />

        <div className="mt-3 text-right">
          <div className="text-sm">
            <span className="text-muted-foreground">Total Penawaran: </span>
            <span className="font-mono tabular-nums font-semibold">
              {formatRupiah(totalPenawaran(values.items))}
            </span>
          </div>
          <p className="text-xs capitalize italic text-muted-foreground">
            {totalPenawaran(values.items)
              ? `${terbilang(totalPenawaran(values.items))} rupiah`
              : "—"}
          </p>
        </div>
        <FieldError className="mt-2" errors={err(form.formState.errors.items)} />
      </BuilderSection>

      <KelengkapanSection
        kelengkapan={values.kelengkapan ?? []}
        onChange={(v) => form.setValue("kelengkapan", v)}
      />

      <BuilderSection title="Catatan & Ketentuan">
        <div className="space-y-4">
          <MasaBerlakuField form={form} />
          <CatatanEditor
            catatan={values.catatan}
            onChange={(v) => form.setValue("catatan", v, { shouldValidate: true })}
          />
        </div>
      </BuilderSection>

      <BuilderSection title="Skema Termin">
        <TerminEditor
          termin={values.termin}
          onChange={(v) => form.setValue("termin", v, { shouldValidate: true })}
        />
      </BuilderSection>

      <BuilderSection title="Pajak">
        <div className="space-y-3">
          <PajakRow
            label="PPN"
            aktif={values.ppnAktif}
            persen={values.ppnPersen}
            onToggle={(c) => form.setValue("ppnAktif", c)}
            onPersen={(n) => form.setValue("ppnPersen", n)}
          />
          <PajakRow
            label="PPh"
            aktif={values.pph23Aktif}
            persen={values.pph23Persen}
            onToggle={(c) => form.setValue("pph23Aktif", c)}
            onPersen={(n) => form.setValue("pph23Persen", n)}
          />
        </div>
      </BuilderSection>

      <BuilderSection title="Tanda Tangan">
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={values.useDigitalSignature}
              onCheckedChange={(c) => {
                form.setValue("useDigitalSignature", c === true);
                if (c !== true) form.setValue("signatureTemplateId", null);
              }}
            />
            Gunakan tanda tangan digital
          </label>
          {values.useDigitalSignature && (
            <Field>
              <FieldLabel>Pilih Tanda Tangan</FieldLabel>
              <Select
                value={values.signatureTemplateId ?? ""}
                onValueChange={(v) => form.setValue("signatureTemplateId", v)}
              >
                <SelectTrigger className="w-full"><SelectValue placeholder="Pilih tanda tangan…" /></SelectTrigger>
                <SelectContent>
                  {signatureTemplates.map((s) => <SelectItem key={s.id} value={s.id}>{s.nama}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          )}
          {!values.useDigitalSignature && (
            <p className="text-xs text-muted-foreground">
              Dokumen akan menyediakan ruang kosong untuk tanda tangan manual dan stempel basah.
            </p>
          )}
        </div>
      </BuilderSection>
    </div>
  );
}
