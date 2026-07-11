"use client";
import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building, ImageUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { onFormInvalid } from "@/lib/form-toast";
import { useKaryawanList } from "@/lib/query/karyawan";
import { useCompanyProfile, useUpdateCompanyProfile, useUploadLogo } from "@/lib/query/company-profile";
import { updateCompanyProfileSchema, type CompanyProfile, type UpdateCompanyProfileInput } from "@/lib/schemas/company-profile";
import { ALLOWED_UPLOAD_EXTENSIONS } from "@/lib/storage/upload-validation";

type CompanyProfileForm = UpdateCompanyProfileInput;

/** 16:9 preview, per docs/design/… "Logo perusahaan (16:9)" convention. */
function LogoField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const { mutateAsync: uploadLogo, isPending } = useUploadLogo();

  return (
    <Field>
      <FieldLabel>Logo</FieldLabel>
      <div className="flex items-center gap-4">
        <div className="flex aspect-video w-40 shrink-0 items-center justify-center overflow-hidden rounded-md border border-dashed border-input bg-muted/30">
          {isPending ? (
            <span className="text-xs text-muted-foreground">Mengunggah…</span>
          ) : value ? (
            <img src={value} alt="Logo perusahaan" className="size-full object-contain" />
          ) : (
            <span className="text-xs text-muted-foreground">Belum ada logo</span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={() => inputRef.current?.click()}>
            <ImageUp className="size-3.5" /> {value ? "Ganti Logo" : "Unggah Logo"}
          </Button>
          {value && (
            <Button type="button" variant="ghost" size="sm" disabled={isPending} onClick={() => onChange("")}>
              <Trash2 className="size-3.5" /> Hapus
            </Button>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_UPLOAD_EXTENSIONS.join(",")}
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            const result = await uploadLogo(file).catch(() => null);
            if (result) onChange(result.url);
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

function toFormValues(profile: CompanyProfile): CompanyProfileForm {
  return {
    nama: profile.nama,
    tagline: profile.tagline,
    logo: profile.logo,
    kota: profile.kota,
    telepon: profile.telepon,
    email: profile.email,
    website: profile.website,
    alamat: profile.alamat,
    npwp: profile.npwp,
    isPkp: profile.isPkp,
    defaultSignerEmployeeId: profile.defaultSignerEmployeeId,
  };
}

function ProfilPerusahaanForm({ profile }: { profile: CompanyProfile }) {
  const { mutateAsync, isPending } = useUpdateCompanyProfile();
  const { data: karyawanList = [] } = useKaryawanList();
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<CompanyProfileForm>({
    resolver: zodResolver(updateCompanyProfileSchema),
    defaultValues: toFormValues(profile),
  });

  React.useEffect(() => {
    reset(toFormValues(profile));
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

          <div className="grid grid-cols-2 gap-4">
            <Field data-invalid={!!errors.npwp}>
              <FieldLabel htmlFor="cp-npwp">NPWP</FieldLabel>
              <Input id="cp-npwp" className="font-mono" aria-invalid={!!errors.npwp} {...register("npwp")} />
              <FieldError errors={errors.npwp ? [errors.npwp] : undefined} />
            </Field>
            <Controller
              control={control}
              name="isPkp"
              render={({ field }) => (
                <Field orientation="horizontal" className="items-center pt-6">
                  <Checkbox id="cp-is-pkp" checked={field.value} onCheckedChange={(v) => field.onChange(!!v)} />
                  <FieldLabel htmlFor="cp-is-pkp" className="font-normal">Berstatus PKP (Pengusaha Kena Pajak)</FieldLabel>
                </Field>
              )}
            />
          </div>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-sm">Penandatangan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Controller
            control={control}
            name="defaultSignerEmployeeId"
            render={({ field }) => (
              <Field>
                <FieldLabel htmlFor="cp-signer">Penandatangan Dokumen</FieldLabel>
                <Select value={field.value ?? undefined} onValueChange={field.onChange}>
                  <SelectTrigger id="cp-signer" className="w-full">
                    <SelectValue placeholder="Pilih karyawan…" />
                  </SelectTrigger>
                  <SelectContent>
                    {karyawanList.map((k) => (
                      <SelectItem key={k.id} value={k.id}>{k.nama} — {k.jabatan}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldDescription>
                  Tampil sebagai penanda tangan pada SPH, Faktur, dan Slip Gaji.
                </FieldDescription>
              </Field>
            )}
          />

          <FieldDescription>
            Rekening bank kini dikelola di Konfigurasi → Daftar Pilihan (kategori Rekening Bank) — tandai satu rekening sebagai default untuk ditampilkan pada dokumen.
          </FieldDescription>
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
