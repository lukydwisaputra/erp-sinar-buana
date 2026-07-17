"use client";
import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { User } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel, FieldError, FieldDescription } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/shared/password-input";
import { Skeleton } from "@/components/ui/skeleton";
import { initials } from "@/components/shared/detail-drawer";
import { onFormInvalid } from "@/lib/form-toast";
import { useProfil, useUpdateProfil, useChangePassword } from "@/lib/query/profil";
import { appRoleLabels } from "@/lib/schemas/pengguna";

const profilFormSchema = z.object({
  fullName: z.string().min(1, "Nama wajib diisi."),
});
type ProfilForm = z.infer<typeof profilFormSchema>;

function ProfilCard() {
  const { data: account, isLoading } = useProfil();
  const updateProfil = useUpdateProfil();
  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm<ProfilForm>({
    resolver: zodResolver(profilFormSchema),
    defaultValues: { fullName: "" },
  });

  React.useEffect(() => {
    if (account) reset({ fullName: account.fullName });
  }, [account, reset]);

  const onSubmit = handleSubmit(async (values) => {
    await updateProfil.mutateAsync(values);
  }, onFormInvalid);

  if (isLoading || !account) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Avatar className="size-12">
            <AvatarFallback className="text-base">{initials(account.fullName)}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle>{account.fullName}</CardTitle>
            <CardDescription>{appRoleLabels[account.role]}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field>
            <FieldLabel htmlFor="p-email">Email</FieldLabel>
            <Input id="p-email" value={account.email ?? "—"} disabled />
            <FieldDescription>Email tidak dapat diubah sendiri — hubungi Admin.</FieldDescription>
          </Field>
          <Field data-invalid={!!errors.fullName}>
            <FieldLabel htmlFor="p-nama">Nama Lengkap</FieldLabel>
            <Input id="p-nama" aria-invalid={!!errors.fullName} {...register("fullName")} />
            <FieldError errors={errors.fullName ? [errors.fullName] : undefined} />
          </Field>
          <Button type="submit" disabled={!isDirty} loading={updateProfil.isPending}>
            Simpan Perubahan
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

const passwordFormSchema = z.object({
  currentPassword: z.string().min(1, "Sandi saat ini wajib diisi."),
  newPassword: z.string().min(8, "Sandi baru minimal 8 karakter."),
  confirmPassword: z.string().min(1, "Konfirmasi sandi wajib diisi."),
}).refine((v) => v.newPassword === v.confirmPassword, {
  message: "Konfirmasi sandi tidak cocok.",
  path: ["confirmPassword"],
});
type PasswordForm = z.infer<typeof passwordFormSchema>;

function UbahSandiCard() {
  const changePassword = useChangePassword();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<PasswordForm>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    await changePassword.mutateAsync({ currentPassword: values.currentPassword, newPassword: values.newPassword });
    reset();
  }, onFormInvalid);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ubah Sandi</CardTitle>
        <CardDescription>Ganti sandi akun Anda sendiri.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field data-invalid={!!errors.currentPassword}>
            <FieldLabel htmlFor="p-current">Sandi Saat Ini</FieldLabel>
            <PasswordInput id="p-current" autoComplete="current-password" aria-invalid={!!errors.currentPassword} {...register("currentPassword")} />
            <FieldError errors={errors.currentPassword ? [errors.currentPassword] : undefined} />
          </Field>
          <Field data-invalid={!!errors.newPassword}>
            <FieldLabel htmlFor="p-new">Sandi Baru</FieldLabel>
            <PasswordInput id="p-new" autoComplete="new-password" aria-invalid={!!errors.newPassword} {...register("newPassword")} />
            <FieldError errors={errors.newPassword ? [errors.newPassword] : undefined} />
          </Field>
          <Field data-invalid={!!errors.confirmPassword}>
            <FieldLabel htmlFor="p-confirm">Konfirmasi Sandi Baru</FieldLabel>
            <PasswordInput id="p-confirm" autoComplete="new-password" aria-invalid={!!errors.confirmPassword} {...register("confirmPassword")} />
            <FieldError errors={errors.confirmPassword ? [errors.confirmPassword] : undefined} />
          </Field>
          <Button type="submit" loading={changePassword.isPending}>Ubah Sandi</Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function ProfilPage() {
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="flex items-center gap-2">
        <User className="size-5 text-muted-foreground" />
        <h1 className="text-xl font-semibold tracking-tight">Profil Saya</h1>
      </div>
      <ProfilCard />
      <UbahSandiCard />
    </div>
  );
}
