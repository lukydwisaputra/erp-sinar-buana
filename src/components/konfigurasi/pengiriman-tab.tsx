"use client";
import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { onFormInvalid } from "@/lib/form-toast";
import { buildEmailSubjek, buildEmailBody, buildPesanWa } from "@/lib/pengiriman-templates";
import {
  usePengirimanConfig, useTestEmailConnection, useUpdateEmailAkun, useUpdateEmailTemplate,
} from "@/lib/query/pengiriman-config";
import type { JenisDokumenKirim } from "@/lib/schemas/pengiriman";
import type { EmailAkun } from "@/lib/schemas/pengiriman-config";

const JENIS_LABEL: Record<JenisDokumenKirim, string> = {
  sph: "Surat Penawaran Harga (SPH)",
  faktur: "Invoice",
  slip: "Slip Gaji",
};

const SAMPLE_DATA = { perusahaan: "PT Contoh Klien", nomor: "SPH/001/1.2026" };

// ── Akun Email/SMTP card ────────────────────────────────────────────────────

const akunFormSchema = z.object({
  host: z.string().min(1, "Host wajib diisi."),
  port: z.coerce.number().int().positive("Port harus angka positif."),
  username: z.string().min(1, "Username wajib diisi."),
  password: z.string().min(1, "Password wajib diisi."),
  fromNama: z.string().min(1, "Nama pengirim wajib diisi."),
  fromEmail: z.string().email("Email tidak valid."),
});
type AkunForm = z.input<typeof akunFormSchema>;

function AkunEmailCard({ akun }: { akun: EmailAkun | null }) {
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const [testResult, setTestResult] = React.useState<{ ok: boolean; message: string } | null>(null);
  const testConnection = useTestEmailConnection();
  const { mutateAsync, isPending } = useUpdateEmailAkun();

  const form = useForm<AkunForm>({
    resolver: zodResolver(akunFormSchema),
    defaultValues: {
      host: akun?.host ?? "", port: akun?.port ?? 587, username: akun?.username ?? "",
      password: akun?.password ?? "", fromNama: akun?.fromNama ?? "", fromEmail: akun?.fromEmail ?? "",
    },
  });
  const { register, handleSubmit, getValues, reset, formState: { errors } } = form;

  React.useEffect(() => {
    reset({
      host: akun?.host ?? "", port: akun?.port ?? 587, username: akun?.username ?? "",
      password: akun?.password ?? "", fromNama: akun?.fromNama ?? "", fromEmail: akun?.fromEmail ?? "",
    });
  }, [akun, reset]);

  async function handleUjiKoneksi() {
    const values = getValues();
    const parsed = akunFormSchema.safeParse(values);
    if (!parsed.success) {
      toast.error("Lengkapi kolom yang wajib diisi sebelum menguji koneksi.");
      return;
    }
    const result = await testConnection.mutateAsync(parsed.data);
    setTestResult(result);
    if (result.ok) toast.success(result.message);
    else toast.error(result.message);
  }

  const onSubmit = handleSubmit(async (values) => {
    if (!testResult?.ok) {
      toast.error("Uji koneksi harus berhasil sebelum menyimpan."); // VR-00.7
      return;
    }
    await mutateAsync({
      host: values.host, port: Number(values.port), username: values.username,
      password: values.password, fromNama: values.fromNama, fromEmail: values.fromEmail,
    });
    setEditing(false);
    setTestResult(null);
  }, onFormInvalid);

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-sm">Akun Email/SMTP</CardTitle>
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
            akun ? (
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
                <div>
                  <p className="text-xs text-muted-foreground">Host</p>
                  <p className="font-mono font-medium">{akun.host}:{akun.port}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Username</p>
                  <p className="font-medium">{akun.username}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pengirim</p>
                  <p className="font-medium">{akun.fromNama} &lt;{akun.fromEmail}&gt;</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Belum dikonfigurasi.</p>
            )
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel>Host SMTP</FieldLabel>
                  <Input placeholder="smtp.gmail.com" {...register("host")} onChange={(e) => { register("host").onChange(e); setTestResult(null); }} />
                  {errors.host && <FieldError>{errors.host.message}</FieldError>}
                </Field>
                <Field>
                  <FieldLabel>Port</FieldLabel>
                  <Input type="number" {...register("port")} />
                  {errors.port && <FieldError>{errors.port.message}</FieldError>}
                </Field>
              </div>
              <Field>
                <FieldLabel>Username</FieldLabel>
                <Input {...register("username")} />
                {errors.username && <FieldError>{errors.username.message}</FieldError>}
              </Field>
              <Field>
                <FieldLabel>Password</FieldLabel>
                <Input type="password" {...register("password")} />
                {errors.password && <FieldError>{errors.password.message}</FieldError>}
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel>Nama Pengirim</FieldLabel>
                  <Input placeholder="SBMJ" {...register("fromNama")} />
                  {errors.fromNama && <FieldError>{errors.fromNama.message}</FieldError>}
                </Field>
                <Field>
                  <FieldLabel>Email Pengirim</FieldLabel>
                  <Input type="email" {...register("fromEmail")} />
                  {errors.fromEmail && <FieldError>{errors.fromEmail.message}</FieldError>}
                </Field>
              </div>

              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" loading={testConnection.isPending} onClick={handleUjiKoneksi}>
                  Uji Koneksi
                </Button>
                {testResult && (
                  <span className={testResult.ok ? "text-xs text-success" : "text-xs text-destructive"}>
                    {testResult.message}
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={isPending || !testResult?.ok}>
                  {isPending ? "Menyimpan…" : "Simpan"}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => { setEditing(false); setTestResult(null); reset(); }}>
                  Batal
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// ── Template Pesan card ─────────────────────────────────────────────────────

const templateFormSchema = z.object({
  subjek: z.string().min(1, "Subjek wajib diisi."),
  body: z.string().min(1, "Isi email wajib diisi."),
});
type TemplateForm = z.input<typeof templateFormSchema>;

function TemplateCard({ jenis, subjek, body, pesanWa }: { jenis: JenisDokumenKirim; subjek: string; body: string; pesanWa: string }) {
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const { mutateAsync, isPending } = useUpdateEmailTemplate();

  const form = useForm<TemplateForm>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: { subjek, body },
  });
  const { register, handleSubmit, reset, formState: { errors } } = form;

  React.useEffect(() => {
    reset({ subjek, body });
  }, [subjek, body, reset]);

  const onSubmit = handleSubmit(async (values) => {
    await mutateAsync({ jenis, template: { subjek: values.subjek, body: values.body } });
    setEditing(false);
  }, onFormInvalid);

  const previewSubjek = buildEmailSubjek({ subjek, body }, SAMPLE_DATA);
  const previewBody = buildEmailBody({ subjek, body }, SAMPLE_DATA);

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-sm">{JENIS_LABEL[jenis]}</CardTitle>
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
        <CardContent className="pt-0 space-y-4">
          {!editing ? (
            <>
              <div className="text-sm">
                <p className="text-xs text-muted-foreground">Pratinjau Subjek</p>
                <p className="font-medium">{previewSubjek}</p>
              </div>
              <div className="text-sm">
                <p className="text-xs text-muted-foreground">Pratinjau Isi Email</p>
                <p className="whitespace-pre-wrap">{previewBody}</p>
              </div>
              <div className="text-sm">
                <p className="text-xs text-muted-foreground">Pesan WhatsApp</p>
                <p className="whitespace-pre-wrap text-muted-foreground">{pesanWa}</p>
              </div>
            </>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <Field>
                <FieldLabel>Subjek Email</FieldLabel>
                <Input {...register("subjek")} />
                {errors.subjek && <FieldError>{errors.subjek.message}</FieldError>}
              </Field>
              <Field>
                <FieldLabel>Isi Email</FieldLabel>
                <Textarea rows={4} {...register("body")} />
                <FieldDescription>Placeholder tersedia: {"{perusahaan}"} {"{nomor}"}</FieldDescription>
                {errors.body && <FieldError>{errors.body.message}</FieldError>}
              </Field>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={isPending}>
                  {isPending ? "Menyimpan…" : "Simpan"}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => { setEditing(false); reset(); }}>
                  Batal
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// ── Tab ──────────────────────────────────────────────────────────────────

export function PengirimanTab() {
  const { data: config, isLoading } = usePengirimanConfig();

  if (isLoading || !config) {
    return <p className="text-sm text-muted-foreground">Memuat…</p>;
  }

  return (
    <div className="space-y-4">
      <AkunEmailCard akun={config.emailAkun} />
      {(["sph", "faktur", "slip"] as const).map((jenis) => (
        <TemplateCard
          key={jenis}
          jenis={jenis}
          subjek={config.emailTemplates[jenis].subjek}
          body={config.emailTemplates[jenis].body}
          pesanWa={buildPesanWa(jenis, SAMPLE_DATA)}
        />
      ))}
    </div>
  );
}
