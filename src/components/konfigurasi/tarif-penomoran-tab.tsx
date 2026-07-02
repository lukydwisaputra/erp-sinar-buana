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
import { Switch } from "@/components/ui/switch";
import { onFormInvalid } from "@/lib/form-toast";
import { useTarifConfig, useUpdateTarifConfig } from "@/lib/query/tarif-config";
import { usePenomoranConfig, useUpdatePenomoranFormat } from "@/lib/query/penomoran";
import { useDashboardParams, useUpdateDashboardParams } from "@/lib/query/dashboard-params";
import type { TarifConfig } from "@/lib/schemas/tarif-config";
import type { DocTypePenomoran } from "@/lib/schemas/penomoran-config";
import type { DashboardParams } from "@/lib/schemas/dashboard-params";

// ── Tarif Pajak & Jatuh Tempo ───────────────────────────────────────────────

const tarifFormSchema = z.object({
  ppnPersenDefault: z.coerce.number().min(0).max(100),
  pph23PersenDefault: z.coerce.number().min(0).max(100),
  statusPkp: z.boolean(),
  jatuhTempoFakturHari: z.coerce.number().int().min(0),
  jatuhTempoPpnHari: z.coerce.number().int().min(0),
  jatuhTempoPphHari: z.coerce.number().int().min(0),
  jatuhTempoBpjsHari: z.coerce.number().int().min(0),
  masaBerlakuPenawaranHariDefault: z.coerce.number().int().min(0),
  pengaliProbationDefault: z.coerce.number().positive(),
});
type TarifForm = z.input<typeof tarifFormSchema>;

function TarifCard({ config }: { config: TarifConfig }) {
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const { mutateAsync, isPending } = useUpdateTarifConfig();

  const form = useForm<TarifForm>({ resolver: zodResolver(tarifFormSchema), defaultValues: config });
  const { register, handleSubmit, control, reset, formState: { errors } } = form;

  React.useEffect(() => { reset(config); }, [config, reset]);

  const onSubmit = handleSubmit(async (values) => {
    await mutateAsync({
      ppnPersenDefault: Number(values.ppnPersenDefault),
      pph23PersenDefault: Number(values.pph23PersenDefault),
      statusPkp: values.statusPkp,
      jatuhTempoFakturHari: Number(values.jatuhTempoFakturHari),
      jatuhTempoPpnHari: Number(values.jatuhTempoPpnHari),
      jatuhTempoPphHari: Number(values.jatuhTempoPphHari),
      jatuhTempoBpjsHari: Number(values.jatuhTempoBpjsHari),
      masaBerlakuPenawaranHariDefault: Number(values.masaBerlakuPenawaranHariDefault),
      pengaliProbationDefault: Number(values.pengaliProbationDefault),
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
              <div><p className="text-xs text-muted-foreground">PPN Default</p><p className="font-mono font-medium">{config.ppnPersenDefault}%</p></div>
              <div><p className="text-xs text-muted-foreground">PPh 23 Default</p><p className="font-mono font-medium">{config.pph23PersenDefault}%</p></div>
              <div><p className="text-xs text-muted-foreground">Status PKP</p><p className="font-medium">{config.statusPkp ? "PKP" : "Non-PKP"}</p></div>
              <div><p className="text-xs text-muted-foreground">Jatuh Tempo Faktur</p><p className="font-mono font-medium">{config.jatuhTempoFakturHari} hari</p></div>
              <div><p className="text-xs text-muted-foreground">Jatuh Tempo PPN</p><p className="font-mono font-medium">{config.jatuhTempoPpnHari} hari</p></div>
              <div><p className="text-xs text-muted-foreground">Jatuh Tempo PPh</p><p className="font-mono font-medium">{config.jatuhTempoPphHari} hari</p></div>
              <div><p className="text-xs text-muted-foreground">Jatuh Tempo BPJS</p><p className="font-mono font-medium">{config.jatuhTempoBpjsHari} hari</p></div>
              <div><p className="text-xs text-muted-foreground">Masa Berlaku SPH</p><p className="font-mono font-medium">{config.masaBerlakuPenawaranHariDefault} hari</p></div>
              <div><p className="text-xs text-muted-foreground">Pengali Probation</p><p className="font-mono font-medium">{config.pengaliProbationDefault}</p></div>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel>PPN Default (%)</FieldLabel>
                  <InputGroup>
                    <InputGroupInput type="number" step="0.1" {...register("ppnPersenDefault")} />
                    <InputGroupAddon align="inline-end"><InputGroupText>%</InputGroupText></InputGroupAddon>
                  </InputGroup>
                  {errors.ppnPersenDefault && <FieldError>{errors.ppnPersenDefault.message}</FieldError>}
                </Field>
                <Field>
                  <FieldLabel>PPh 23 Default (%)</FieldLabel>
                  <InputGroup>
                    <InputGroupInput type="number" step="0.1" {...register("pph23PersenDefault")} />
                    <InputGroupAddon align="inline-end"><InputGroupText>%</InputGroupText></InputGroupAddon>
                  </InputGroup>
                  {errors.pph23PersenDefault && <FieldError>{errors.pph23PersenDefault.message}</FieldError>}
                </Field>
              </div>

              <Field>
                <div className="flex items-center justify-between gap-2">
                  <FieldLabel className="mb-0">Status PKP</FieldLabel>
                  <Controller name="statusPkp" control={control} render={({ field }) => (
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  )} />
                </div>
                <FieldDescription>Menentukan default aktif/tidaknya PPN pada dokumen baru.</FieldDescription>
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel>Jatuh Tempo Faktur (hari)</FieldLabel>
                  <Input type="number" {...register("jatuhTempoFakturHari")} />
                  {errors.jatuhTempoFakturHari && <FieldError>{errors.jatuhTempoFakturHari.message}</FieldError>}
                </Field>
                <Field>
                  <FieldLabel>Masa Berlaku SPH (hari)</FieldLabel>
                  <Input type="number" {...register("masaBerlakuPenawaranHariDefault")} />
                  {errors.masaBerlakuPenawaranHariDefault && <FieldError>{errors.masaBerlakuPenawaranHariDefault.message}</FieldError>}
                </Field>
                <Field>
                  <FieldLabel>Jatuh Tempo PPN (hari)</FieldLabel>
                  <Input type="number" {...register("jatuhTempoPpnHari")} />
                </Field>
                <Field>
                  <FieldLabel>Jatuh Tempo PPh (hari)</FieldLabel>
                  <Input type="number" {...register("jatuhTempoPphHari")} />
                </Field>
                <Field>
                  <FieldLabel>Jatuh Tempo BPJS (hari)</FieldLabel>
                  <Input type="number" {...register("jatuhTempoBpjsHari")} />
                </Field>
                <Field>
                  <FieldLabel>Pengali Probation</FieldLabel>
                  <Input type="number" step="0.01" {...register("pengaliProbationDefault")} />
                  <FieldDescription>Dipakai bila Daftar Pilihan tidak punya baris Probation.</FieldDescription>
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

const DOC_TYPE_LABEL: Record<DocTypePenomoran, string> = { sph: "SPH", inv: "Invoice", proyek: "Proyek" };

function PenomoranCard({ formats }: { formats: { docType: DocTypePenomoran; format: string }[] }) {
  const [open, setOpen] = React.useState(false);
  const [editingType, setEditingType] = React.useState<DocTypePenomoran | null>(null);
  const [value, setValue] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const { mutateAsync, isPending } = useUpdatePenomoranFormat();

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-sm">Format Penomoran</CardTitle>
        <CardAction>
          <Button variant="ghost" size="icon" className="size-7" onClick={() => setOpen((o) => !o)}>
            {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </Button>
        </CardAction>
      </CardHeader>
      {open && (
        <CardContent className="pt-0 space-y-3">
          {formats.map((f) => (
            <div key={f.docType} className="flex items-center justify-between gap-2 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">{DOC_TYPE_LABEL[f.docType]}</p>
                {editingType === f.docType ? (
                  <Input
                    className="mt-1 h-8 font-mono text-sm"
                    value={value}
                    onChange={(e) => { setValue(e.target.value); setError(null); }}
                  />
                ) : (
                  <p className="font-mono font-medium">{f.format}</p>
                )}
                {editingType === f.docType && error && <p className="mt-1 text-xs text-destructive">{error}</p>}
              </div>
              {editingType === f.docType ? (
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    disabled={isPending}
                    onClick={async () => {
                      if (!value.includes("{urut}")) { setError("Format nomor harus memuat {urut}."); return; }
                      await mutateAsync({ docType: f.docType, format: value });
                      setEditingType(null);
                    }}
                  >
                    Simpan
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingType(null)}>Batal</Button>
                </div>
              ) : (
                <Button
                  variant="ghost" size="sm" className="h-7 text-xs"
                  onClick={() => { setEditingType(f.docType); setValue(f.format); setError(null); }}
                >
                  Ubah
                </Button>
              )}
            </div>
          ))}
          <FieldDescription>
            Placeholder: {"{urut}"} (wajib), {"{bulan}"}, {"{tahun}"}. Penomoran ini hanya berlaku untuk dokumen baru
            — dokumen lama tidak dinomori ulang.
          </FieldDescription>
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
  const { data: tarif, isLoading: tarifLoading } = useTarifConfig();
  const { data: penomoran, isLoading: penomoranLoading } = usePenomoranConfig();
  const { data: dashboardParams, isLoading: paramsLoading } = useDashboardParams();

  if (tarifLoading || penomoranLoading || paramsLoading || !tarif || !penomoran || !dashboardParams) {
    return <p className="text-sm text-muted-foreground">Memuat…</p>;
  }

  return (
    <div className="space-y-4">
      <TarifCard config={tarif} />
      <PenomoranCard formats={penomoran.formats} />
      <DashboardParamsCard params={dashboardParams} />
    </div>
  );
}
