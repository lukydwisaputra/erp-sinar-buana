"use client";
import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { onFormInvalid } from "@/lib/form-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTaxSettings, useUpdateTaxSettings } from "@/lib/query/tax-settings";
import { useNumberingSettings, useUpdateNumberingSettings } from "@/lib/query/numbering-settings";
import { useDashboardParams, useUpdateDashboardParams } from "@/lib/query/dashboard-params";
import { usePajakConfig, useUpdatePajakConfig } from "@/lib/query/pajak-config";
import type { TaxSettings } from "@/lib/schemas/tax-settings";
import type { NumberingSettings, DocTypeNumbering } from "@/lib/schemas/numbering";
import type { DashboardParams } from "@/lib/schemas/dashboard-params";
import type { PajakConfig, PphBadanMetode } from "@/lib/schemas/pajak-config";

// ── Tarif Pajak & Jatuh Tempo ───────────────────────────────────────────────

const taxSettingsFormSchema = z.object({
  ppnRate: z.coerce.number().min(0).max(100),
  ppnDppNumerator: z.coerce.number().int().positive(),
  ppnDppDenominator: z.coerce.number().int().positive(),
  ppnSetorDay: z.coerce.number().int().min(1).max(31),
  pph23Rate: z.coerce.number().min(0).max(100),
  pph23SetorDay: z.coerce.number().int().min(1).max(31),
  pph23LaporDay: z.coerce.number().int().min(1).max(31),
  pph21SetorDay: z.coerce.number().int().min(1).max(31),
  pph21LaporDay: z.coerce.number().int().min(1).max(31),
  bpjsSetorDay: z.coerce.number().int().min(1).max(31),
  invoiceDueDays: z.coerce.number().int().min(0),
  quotationValidityDays: z.coerce.number().int().min(0),
});
type TaxSettingsForm = z.input<typeof taxSettingsFormSchema>;

function TarifCard({ config }: { config: TaxSettings }) {
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const { mutateAsync, isPending } = useUpdateTaxSettings();

  const form = useForm<TaxSettingsForm>({ resolver: zodResolver(taxSettingsFormSchema), defaultValues: config });
  const { register, handleSubmit, reset, formState: { errors } } = form;

  React.useEffect(() => { reset(config); }, [config, reset]);

  const onSubmit = handleSubmit(async (values) => {
    await mutateAsync({
      ppnRate: Number(values.ppnRate),
      ppnDppNumerator: Number(values.ppnDppNumerator),
      ppnDppDenominator: Number(values.ppnDppDenominator),
      ppnSetorDay: Number(values.ppnSetorDay),
      pph23Rate: Number(values.pph23Rate),
      pph23SetorDay: Number(values.pph23SetorDay),
      pph23LaporDay: Number(values.pph23LaporDay),
      pph21SetorDay: Number(values.pph21SetorDay),
      pph21LaporDay: Number(values.pph21LaporDay),
      bpjsSetorDay: Number(values.bpjsSetorDay),
      invoiceDueDays: Number(values.invoiceDueDays),
      quotationValidityDays: Number(values.quotationValidityDays),
    });
    setEditing(false);
  }, onFormInvalid);

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-sm">Tarif Pajak & Jatuh Tempo</CardTitle>
        <CardAction className="flex items-center gap-1">
          {!editing && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setEditing(true); setOpen(true); }}>
              Ubah
            </Button>
          )}
          <Button variant="ghost" size="icon" className="size-7" onClick={() => setOpen((o) => !o)}>
            {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </Button>
        </CardAction>
      </CardHeader>

      {open && (
        <CardContent className="pt-0">
          {!editing ? (
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
              <div><p className="text-xs text-muted-foreground">PPN</p><p className="font-mono font-medium">{config.ppnRate}%</p></div>
              <div><p className="text-xs text-muted-foreground">PPN DPP</p><p className="font-mono font-medium">{config.ppnDppNumerator}/{config.ppnDppDenominator}</p></div>
              <div><p className="text-xs text-muted-foreground">Setor PPN</p><p className="font-mono font-medium">Tgl {config.ppnSetorDay}</p></div>
              <div><p className="text-xs text-muted-foreground">PPh</p><p className="font-mono font-medium">{config.pph23Rate}%</p></div>
              <div><p className="text-xs text-muted-foreground">Setor PPh</p><p className="font-mono font-medium">Tgl {config.pph23SetorDay}</p></div>
              <div><p className="text-xs text-muted-foreground">Lapor PPh</p><p className="font-mono font-medium">Tgl {config.pph23LaporDay}</p></div>
              <div><p className="text-xs text-muted-foreground">Setor PPh 21</p><p className="font-mono font-medium">Tgl {config.pph21SetorDay}</p></div>
              <div><p className="text-xs text-muted-foreground">Lapor PPh 21</p><p className="font-mono font-medium">Tgl {config.pph21LaporDay}</p></div>
              <div><p className="text-xs text-muted-foreground">Setor BPJS</p><p className="font-mono font-medium">Tgl {config.bpjsSetorDay}</p></div>
              <div><p className="text-xs text-muted-foreground">Jatuh Tempo Faktur</p><p className="font-mono font-medium">{config.invoiceDueDays} hari</p></div>
              <div><p className="text-xs text-muted-foreground">Masa Berlaku SPH</p><p className="font-mono font-medium">{config.quotationValidityDays} hari</p></div>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <p className="text-xs font-medium text-muted-foreground">PPN</p>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Field>
                  <FieldLabel>Tarif (%)</FieldLabel>
                  <InputGroup>
                    <InputGroupInput type="number" step="0.1" {...register("ppnRate")} />
                    <InputGroupAddon align="inline-end"><InputGroupText>%</InputGroupText></InputGroupAddon>
                  </InputGroup>
                  {errors.ppnRate && <FieldError>{errors.ppnRate.message}</FieldError>}
                </Field>
                <Field>
                  <FieldLabel>DPP Pembilang</FieldLabel>
                  <Input type="number" {...register("ppnDppNumerator")} />
                </Field>
                <Field>
                  <FieldLabel>DPP Penyebut</FieldLabel>
                  <Input type="number" {...register("ppnDppDenominator")} />
                </Field>
                <Field>
                  <FieldLabel>Tanggal Setor</FieldLabel>
                  <Input type="number" {...register("ppnSetorDay")} />
                </Field>
              </div>

              <p className="text-xs font-medium text-muted-foreground">PPh</p>
              <div className="grid grid-cols-3 gap-4">
                <Field>
                  <FieldLabel>Tarif (%)</FieldLabel>
                  <InputGroup>
                    <InputGroupInput type="number" step="0.1" {...register("pph23Rate")} />
                    <InputGroupAddon align="inline-end"><InputGroupText>%</InputGroupText></InputGroupAddon>
                  </InputGroup>
                  {errors.pph23Rate && <FieldError>{errors.pph23Rate.message}</FieldError>}
                </Field>
                <Field>
                  <FieldLabel>Tanggal Setor</FieldLabel>
                  <Input type="number" {...register("pph23SetorDay")} />
                </Field>
                <Field>
                  <FieldLabel>Tanggal Lapor</FieldLabel>
                  <Input type="number" {...register("pph23LaporDay")} />
                </Field>
              </div>

              <p className="text-xs font-medium text-muted-foreground">PPh 21 & BPJS</p>
              <div className="grid grid-cols-3 gap-4">
                <Field>
                  <FieldLabel>Setor PPh 21</FieldLabel>
                  <Input type="number" {...register("pph21SetorDay")} />
                </Field>
                <Field>
                  <FieldLabel>Lapor PPh 21</FieldLabel>
                  <Input type="number" {...register("pph21LaporDay")} />
                </Field>
                <Field>
                  <FieldLabel>Setor BPJS</FieldLabel>
                  <Input type="number" {...register("bpjsSetorDay")} />
                </Field>
              </div>

              <p className="text-xs font-medium text-muted-foreground">Umum</p>
              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel>Jatuh Tempo Faktur (hari)</FieldLabel>
                  <Input type="number" {...register("invoiceDueDays")} />
                  {errors.invoiceDueDays && <FieldError>{errors.invoiceDueDays.message}</FieldError>}
                </Field>
                <Field>
                  <FieldLabel>Masa Berlaku SPH (hari)</FieldLabel>
                  <Input type="number" {...register("quotationValidityDays")} />
                  {errors.quotationValidityDays && <FieldError>{errors.quotationValidityDays.message}</FieldError>}
                </Field>
              </div>

              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={isPending}>{isPending ? "Menyimpan…" : "Simpan"}</Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => { setEditing(false); reset(config); }}>Batal</Button>
              </div>
            </form>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// ── Format Penomoran ────────────────────────────────────────────────────────

const DOC_TYPE_LABEL: Record<DocTypeNumbering, string> = {
  sph: "SPH", inv: "Invoice", gaj: "Slip Gaji",
  pry: "Proyek", prs: "Perusahaan", klg: "Kelengkapan Administrasi", fki: "Faktur Induk",
  lyn: "Katalog Layanan", kry: "Karyawan",
};

const numberingFormSchema = z.object({
  sphFormat: z.string().refine((s) => s.includes("{seq}"), "Format nomor harus memuat {seq}."),
  invFormat: z.string().refine((s) => s.includes("{seq}"), "Format nomor harus memuat {seq}."),
  gajFormat: z.string().refine((s) => s.includes("{seq}"), "Format nomor harus memuat {seq}."),
  pryFormat: z.string().refine((s) => s.includes("{seq}"), "Format nomor harus memuat {seq}."),
  prsFormat: z.string().refine((s) => s.includes("{seq}"), "Format nomor harus memuat {seq}."),
  klgFormat: z.string().refine((s) => s.includes("{seq}"), "Format nomor harus memuat {seq}."),
  fkiFormat: z.string().refine((s) => s.includes("{seq}"), "Format nomor harus memuat {seq}."),
  lynFormat: z.string().refine((s) => s.includes("{seq}"), "Format nomor harus memuat {seq}."),
  kryFormat: z.string().refine((s) => s.includes("{seq}"), "Format nomor harus memuat {seq}."),
  seqPadding: z.coerce.number().int().min(1).max(10),
});
type NumberingForm = z.input<typeof numberingFormSchema>;

type NumberingFieldKey = "sphFormat" | "invFormat" | "gajFormat" | "pryFormat" | "prsFormat" | "klgFormat" | "fkiFormat" | "lynFormat" | "kryFormat";

const NUMBERING_FIELDS: { key: NumberingFieldKey; docType: DocTypeNumbering }[] = [
  { key: "sphFormat", docType: "sph" },
  { key: "invFormat", docType: "inv" },
  { key: "gajFormat", docType: "gaj" },
  { key: "pryFormat", docType: "pry" },
  { key: "prsFormat", docType: "prs" },
  { key: "klgFormat", docType: "klg" },
  { key: "fkiFormat", docType: "fki" },
  { key: "lynFormat", docType: "lyn" },
  { key: "kryFormat", docType: "kry" },
];

function PenomoranCard({ settings }: { settings: NumberingSettings }) {
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const { mutateAsync, isPending } = useUpdateNumberingSettings();

  const form = useForm<NumberingForm>({ resolver: zodResolver(numberingFormSchema), defaultValues: settings });
  const { register, handleSubmit, reset, formState: { errors } } = form;

  React.useEffect(() => { reset(settings); }, [settings, reset]);

  const onSubmit = handleSubmit(async (values) => {
    await mutateAsync({
      sphFormat: values.sphFormat,
      invFormat: values.invFormat,
      gajFormat: values.gajFormat,
      pryFormat: values.pryFormat,
      prsFormat: values.prsFormat,
      klgFormat: values.klgFormat,
      fkiFormat: values.fkiFormat,
      lynFormat: values.lynFormat,
      kryFormat: values.kryFormat,
      seqPadding: Number(values.seqPadding),
    });
    setEditing(false);
  }, onFormInvalid);

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-sm">Format Penomoran</CardTitle>
        <CardAction className="flex items-center gap-1">
          {!editing && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setEditing(true); setOpen(true); }}>
              Ubah
            </Button>
          )}
          <Button variant="ghost" size="icon" className="size-7" onClick={() => setOpen((o) => !o)}>
            {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </Button>
        </CardAction>
      </CardHeader>
      {open && (
        <CardContent className="pt-0">
          {!editing ? (
            <div className="space-y-2 text-sm">
              {NUMBERING_FIELDS.map(({ key, docType }) => (
                <div key={key}>
                  <p className="text-xs text-muted-foreground">{DOC_TYPE_LABEL[docType]}</p>
                  <p className="font-mono font-medium">{settings[key]}</p>
                </div>
              ))}
              <div><p className="text-xs text-muted-foreground">Padding Urut</p><p className="font-mono font-medium">{settings.seqPadding} digit</p></div>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              {NUMBERING_FIELDS.map(({ key, docType }) => (
                <Field key={key}>
                  <FieldLabel>{DOC_TYPE_LABEL[docType]}</FieldLabel>
                  <Input className="font-mono" {...register(key)} />
                  {errors[key] && <FieldError>{errors[key]?.message}</FieldError>}
                </Field>
              ))}
              <Field>
                <FieldLabel>Padding Urut (digit)</FieldLabel>
                <Input type="number" {...register("seqPadding")} />
                {errors.seqPadding && <FieldError>{errors.seqPadding.message}</FieldError>}
              </Field>
              <FieldDescription>
                Placeholder: {"{seq}"} (wajib), {"{month}"}, {"{year}"}. Nomor bersifat tetap setelah dokumen dibuat —
                mengubah format ini hanya berlaku untuk dokumen baru.
              </FieldDescription>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={isPending}>{isPending ? "Menyimpan…" : "Simpan"}</Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => { setEditing(false); reset(settings); }}>Batal</Button>
              </div>
            </form>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// ── PPh Badan ────────────────────────────────────────────────────────────

const METODE_LABEL: Record<PphBadanMetode, string> = {
  final_05: "Final 0,5% Omzet (PP 55/2022)",
  badan_22: "22% atas Laba",
};

const pphBadanFormSchema = z.object({
  metode: z.enum(["final_05", "badan_22"]),
  tarifFinalPersen: z.coerce.number().nonnegative(),
  tarifBadanPersen: z.coerce.number().nonnegative(),
  ambangOmzet: z.coerce.number().nonnegative(),
});
type PphBadanForm = z.input<typeof pphBadanFormSchema>;

function PphBadanCard({ config }: { config: PajakConfig }) {
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const { mutateAsync, isPending } = useUpdatePajakConfig();

  const form = useForm<PphBadanForm>({ resolver: zodResolver(pphBadanFormSchema), defaultValues: config });
  const { register, handleSubmit, control, reset, formState: { errors } } = form;

  React.useEffect(() => { reset(config); }, [config, reset]);

  const onSubmit = handleSubmit(async (values) => {
    await mutateAsync({
      metode: values.metode,
      tarifFinalPersen: Number(values.tarifFinalPersen),
      tarifBadanPersen: Number(values.tarifBadanPersen),
      ambangOmzet: Number(values.ambangOmzet),
    });
    setEditing(false);
  }, onFormInvalid);

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-sm">PPh Badan</CardTitle>
        <CardAction className="flex items-center gap-1">
          {!editing && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setEditing(true); setOpen(true); }}>
              Ubah
            </Button>
          )}
          <Button variant="ghost" size="icon" className="size-7" onClick={() => setOpen((o) => !o)}>
            {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </Button>
        </CardAction>
      </CardHeader>
      {open && (
        <CardContent className="pt-0">
          {!editing ? (
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
              <div><p className="text-xs text-muted-foreground">Metode</p><p className="font-medium">{METODE_LABEL[config.metode]}</p></div>
              <div><p className="text-xs text-muted-foreground">Tarif Final</p><p className="font-mono font-medium">{config.tarifFinalPersen}%</p></div>
              <div><p className="text-xs text-muted-foreground">Tarif Badan</p><p className="font-mono font-medium">{config.tarifBadanPersen}%</p></div>
              <div><p className="text-xs text-muted-foreground">Ambang Omzet</p><p className="font-mono font-medium">Rp {(config.ambangOmzet / 1_000_000_000).toFixed(1)}M</p></div>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <Field>
                <FieldLabel>Metode</FieldLabel>
                <Controller
                  name="metode"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(METODE_LABEL) as PphBadanMetode[]).map((m) => (
                          <SelectItem key={m} value={m}>{METODE_LABEL[m]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldDescription>Menentukan estimasi PPh Badan pada Laba-Rugi Dasbor (Bab 10.8).</FieldDescription>
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel>Tarif Final (%)</FieldLabel>
                  <InputGroup>
                    <InputGroupInput type="number" step="0.1" {...register("tarifFinalPersen")} />
                    <InputGroupAddon align="inline-end"><InputGroupText>%</InputGroupText></InputGroupAddon>
                  </InputGroup>
                  {errors.tarifFinalPersen && <FieldError>{errors.tarifFinalPersen.message}</FieldError>}
                </Field>
                <Field>
                  <FieldLabel>Tarif Badan (%)</FieldLabel>
                  <InputGroup>
                    <InputGroupInput type="number" step="0.1" {...register("tarifBadanPersen")} />
                    <InputGroupAddon align="inline-end"><InputGroupText>%</InputGroupText></InputGroupAddon>
                  </InputGroup>
                  {errors.tarifBadanPersen && <FieldError>{errors.tarifBadanPersen.message}</FieldError>}
                </Field>
              </div>
              <Field>
                <FieldLabel>Ambang Omzet (Rp)</FieldLabel>
                <Input type="number" {...register("ambangOmzet")} />
                <FieldDescription>Default Rp 4,8 M/tahun (PP 55/2022).</FieldDescription>
                {errors.ambangOmzet && <FieldError>{errors.ambangOmzet.message}</FieldError>}
              </Field>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={isPending}>{isPending ? "Menyimpan…" : "Simpan"}</Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => { setEditing(false); reset(config); }}>Batal</Button>
              </div>
            </form>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// ── Parameter Dasbor ─────────────────────────────────────────────────────

const dashboardFormSchema = z.object({
  horizonProyeksiHari: z.coerce.number().int().positive(),
  ambangMarginProyek: z.coerce.number().min(0).max(1),
  ambangMangkrakHari: z.coerce.number().int().positive(),
});
type DashboardForm = z.input<typeof dashboardFormSchema>;

function DashboardParamsCard({ params }: { params: DashboardParams }) {
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const { mutateAsync, isPending } = useUpdateDashboardParams();

  const form = useForm<DashboardForm>({ resolver: zodResolver(dashboardFormSchema), defaultValues: params });
  const { register, handleSubmit, reset, formState: { errors } } = form;

  React.useEffect(() => { reset(params); }, [params, reset]);

  const onSubmit = handleSubmit(async (values) => {
    await mutateAsync({
      horizonProyeksiHari: Number(values.horizonProyeksiHari),
      ambangMarginProyek: Number(values.ambangMarginProyek),
      ambangMangkrakHari: Number(values.ambangMangkrakHari),
    });
    setEditing(false);
  }, onFormInvalid);

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-sm">Parameter Dasbor</CardTitle>
        <CardAction className="flex items-center gap-1">
          {!editing && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setEditing(true); setOpen(true); }}>
              Ubah
            </Button>
          )}
          <Button variant="ghost" size="icon" className="size-7" onClick={() => setOpen((o) => !o)}>
            {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </Button>
        </CardAction>
      </CardHeader>
      {open && (
        <CardContent className="pt-0">
          {!editing ? (
            <div className="grid grid-cols-3 gap-x-6 gap-y-2 text-sm">
              <div><p className="text-xs text-muted-foreground">Horizon Proyeksi Kas</p><p className="font-mono font-medium">{params.horizonProyeksiHari} hari</p></div>
              <div><p className="text-xs text-muted-foreground">Ambang Margin Proyek</p><p className="font-mono font-medium">{(params.ambangMarginProyek * 100).toFixed(0)}%</p></div>
              <div><p className="text-xs text-muted-foreground">Ambang Proyek Mangkrak</p><p className="font-mono font-medium">{params.ambangMangkrakHari} hari</p></div>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <Field>
                  <FieldLabel>Horizon Proyeksi (hari)</FieldLabel>
                  <Input type="number" {...register("horizonProyeksiHari")} />
                  {errors.horizonProyeksiHari && <FieldError>{errors.horizonProyeksiHari.message}</FieldError>}
                </Field>
                <Field>
                  <FieldLabel>Ambang Margin (0-1)</FieldLabel>
                  <Input type="number" step="0.01" {...register("ambangMarginProyek")} />
                  <FieldDescription>Fraksi, mis. 0.1 = 10%.</FieldDescription>
                  {errors.ambangMarginProyek && <FieldError>{errors.ambangMarginProyek.message}</FieldError>}
                </Field>
                <Field>
                  <FieldLabel>Ambang Mangkrak (hari)</FieldLabel>
                  <Input type="number" {...register("ambangMangkrakHari")} />
                  {errors.ambangMangkrakHari && <FieldError>{errors.ambangMangkrakHari.message}</FieldError>}
                </Field>
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={isPending}>{isPending ? "Menyimpan…" : "Simpan"}</Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => { setEditing(false); reset(params); }}>Batal</Button>
              </div>
            </form>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// ── Tab ──────────────────────────────────────────────────────────────────

export function TarifPenomoranTab() {
  const { data: taxSettings, isLoading: taxLoading } = useTaxSettings();
  const { data: numbering, isLoading: numberingLoading } = useNumberingSettings();
  const { data: dashboardParams, isLoading: paramsLoading } = useDashboardParams();
  const { data: pajakConfig, isLoading: pajakLoading } = usePajakConfig();

  if (
    taxLoading || numberingLoading || paramsLoading || pajakLoading ||
    !taxSettings || !numbering || !dashboardParams || !pajakConfig
  ) {
    return <p className="text-sm text-muted-foreground">Memuat…</p>;
  }

  return (
    <div className="space-y-4">
      <TarifCard config={taxSettings} />
      <PenomoranCard settings={numbering} />
      <PphBadanCard config={pajakConfig} />
      <DashboardParamsCard params={dashboardParams} />
    </div>
  );
}
