"use client";
import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building, ImageUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { onFormInvalid } from "@/lib/form-toast";
import { useCompanyProfile, useUpdateCompanyProfile } from "@/lib/query/company-profile";
import { companyProfileSchema, type CompanyProfile } from "@/lib/schemas/company-profile";

type CompanyProfileForm = CompanyProfile;

/** 16:9 preview, per docs/design/… "Logo perusahaan (16:9)" convention. */
function LogoField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  return (
    <Field>
      <FieldLabel>Logo</FieldLabel>
      <div className="flex items-center gap-4">
        <div className="flex aspect-video w-40 shrink-0 items-center justify-center overflow-hidden rounded-md border border-dashed border-input bg-muted/30">
          {value ? (
            // Object-URL preview from the file picker below — no upload backend yet (mock prototype).
            <img src={value} alt="Logo perusahaan" className="size-full object-contain" />
          ) : (
            <span className="text-xs text-muted-foreground">Belum ada logo</span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
            <ImageUp className="size-3.5" /> {value ? "Ganti Logo" : "Unggah Logo"}
          </Button>
          {value && (
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")}>
              <Trash2 className="size-3.5" /> Hapus
            </Button>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onChange(URL.createObjectURL(file));
            e.target.value = "";
          }}
        />
      </div>
      <FieldDescription>
        Dipakai pada kop &amp; sampul dokumen (SPH, Faktur, Slip Gaji) dan sidebar aplikasi. Kosongkan untuk memakai lencana SBMJ bawaan.
      </FieldDescription>
    </Field>
  );
}

function AlamatField({
  value,
  onChange,
  error,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  error?: { message?: string };
}) {
  return (
    <Field>
      <FieldLabel>Alamat</FieldLabel>
      <div className="space-y-2">
        {value.map((line, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              value={line}
              placeholder={`Alamat ${i + 1}`}
              onChange={(e) => {
                const next = [...value];
                next[i] = e.target.value;
                onChange(next);
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={value.length <= 1}
              onClick={() => onChange(value.filter((_, idx) => idx !== i))}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-1 w-fit"
        onClick={() => onChange([...value, ""])}
      >
        <Plus className="size-3.5" /> Tambah Alamat
      </Button>
      <FieldError errors={error ? [error] : undefined} />
    </Field>
  );
}

function ProfilPerusahaanForm({ profile }: { profile: CompanyProfile }) {
  const { mutateAsync, isPending } = useUpdateCompanyProfile();
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<CompanyProfileForm>({
    resolver: zodResolver(companyProfileSchema),
    defaultValues: profile,
  });

  React.useEffect(() => {
    reset(profile);
  }, [profile, reset]);

  const onSubmit = handleSubmit(async (values) => {
    await mutateAsync(values);
  }, onFormInvalid);

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-sm">Identitas & Kontak</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field data-invalid={!!errors.nama}>
              <FieldLabel htmlFor="cp-nama">Nama Perusahaan</FieldLabel>
              <Input id="cp-nama" aria-invalid={!!errors.nama} {...register("nama")} />
              <FieldError errors={errors.nama ? [errors.nama] : undefined} />
            </Field>
            <Field>
              <FieldLabel htmlFor="cp-tagline">Tagline</FieldLabel>
              <Input id="cp-tagline" {...register("tagline")} />
            </Field>
          </div>

          <Controller
            control={control}
            name="logo"
            render={({ field }) => <LogoField value={field.value} onChange={field.onChange} />}
          />

          <Controller
            control={control}
            name="alamat"
            render={({ field }) => (
              <AlamatField value={field.value} onChange={field.onChange} error={errors.alamat} />
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <Field data-invalid={!!errors.kota}>
              <FieldLabel htmlFor="cp-kota">Kota</FieldLabel>
              <Input id="cp-kota" aria-invalid={!!errors.kota} {...register("kota")} />
              <FieldError errors={errors.kota ? [errors.kota] : undefined} />
            </Field>
            <Field data-invalid={!!errors.telepon}>
              <FieldLabel htmlFor="cp-telepon">Telepon</FieldLabel>
              <Input id="cp-telepon" aria-invalid={!!errors.telepon} {...register("telepon")} />
              <FieldError errors={errors.telepon ? [errors.telepon] : undefined} />
            </Field>
            <Field data-invalid={!!errors.email}>
              <FieldLabel htmlFor="cp-email">Email</FieldLabel>
              <Input id="cp-email" type="email" aria-invalid={!!errors.email} {...register("email")} />
              <FieldError errors={errors.email ? [errors.email] : undefined} />
            </Field>
            <Field>
              <FieldLabel htmlFor="cp-website">Website</FieldLabel>
              <Input id="cp-website" {...register("website")} />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-sm">Direktur & Rekening Bank</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field data-invalid={!!errors.direktur?.nama}>
              <FieldLabel htmlFor="cp-direktur-nama">Nama Direktur</FieldLabel>
              <Input id="cp-direktur-nama" aria-invalid={!!errors.direktur?.nama} {...register("direktur.nama")} />
              <FieldError errors={errors.direktur?.nama ? [errors.direktur.nama] : undefined} />
            </Field>
            <Field data-invalid={!!errors.direktur?.jabatan}>
              <FieldLabel htmlFor="cp-direktur-jabatan">Jabatan</FieldLabel>
              <Input id="cp-direktur-jabatan" aria-invalid={!!errors.direktur?.jabatan} {...register("direktur.jabatan")} />
              <FieldError errors={errors.direktur?.jabatan ? [errors.direktur.jabatan] : undefined} />
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Field data-invalid={!!errors.bank?.nama}>
              <FieldLabel htmlFor="cp-bank-nama">Nama Bank</FieldLabel>
              <Input id="cp-bank-nama" aria-invalid={!!errors.bank?.nama} {...register("bank.nama")} />
              <FieldError errors={errors.bank?.nama ? [errors.bank.nama] : undefined} />
            </Field>
            <Field data-invalid={!!errors.bank?.atasNama}>
              <FieldLabel htmlFor="cp-bank-an">Atas Nama</FieldLabel>
              <Input id="cp-bank-an" aria-invalid={!!errors.bank?.atasNama} {...register("bank.atasNama")} />
              <FieldError errors={errors.bank?.atasNama ? [errors.bank.atasNama] : undefined} />
            </Field>
            <Field data-invalid={!!errors.bank?.noRekening}>
              <FieldLabel htmlFor="cp-bank-no">Nomor Rekening</FieldLabel>
              <Input id="cp-bank-no" className="font-mono" aria-invalid={!!errors.bank?.noRekening} {...register("bank.noRekening")} />
              <FieldError errors={errors.bank?.noRekening ? [errors.bank.noRekening] : undefined} />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={isPending}>
        {isPending ? "Menyimpan…" : "Simpan Perubahan"}
      </Button>
    </form>
  );
}

export default function ProfilPerusahaanPage() {
  const { data: profile, isLoading } = useCompanyProfile();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Building className="size-5 text-muted-foreground" />
        <h1 className="text-xl font-semibold tracking-tight">Profil Perusahaan</h1>
      </div>

      {isLoading || !profile ? (
        <p className="text-sm text-muted-foreground">Memuat…</p>
      ) : (
        <ProfilPerusahaanForm profile={profile} />
      )}
    </div>
  );
}
