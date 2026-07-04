"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { onFormInvalid } from "@/lib/form-toast";
import { useRequestReset, useResetPassword } from "@/lib/query/session";
import { ApiError } from "@/lib/api-client";

const requestFormSchema = z.object({
  email: z.string().min(1, "Email wajib diisi.").email("Format email tidak valid."),
});
type RequestForm = z.infer<typeof requestFormSchema>;

const completeFormSchema = z.object({
  password: z.string().min(8, "Sandi minimal 8 karakter."),
});
type CompleteForm = z.infer<typeof completeFormSchema>;

function RequestResetCard() {
  const requestReset = useRequestReset();
  const [submitted, setSubmitted] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RequestForm>({ resolver: zodResolver(requestFormSchema) });

  const onSubmit = handleSubmit((values) => {
    requestReset.mutate(values, { onSuccess: () => setSubmitted(true) });
  }, onFormInvalid);

  if (submitted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Periksa email Anda</CardTitle>
          <CardDescription>
            Jika email terdaftar, tautan atur ulang sandi telah dikirim. Belum menerima? Hubungi
            Admin.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lupa Sandi</CardTitle>
        <CardDescription>Masukkan email akun Anda untuk menerima tautan atur ulang.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="reset-email">Email</FieldLabel>
            <Input id="reset-email" type="email" autoComplete="username" {...register("email")} />
            <FieldError errors={errors.email ? [errors.email] : undefined} />
          </Field>
          <Button type="submit" disabled={requestReset.isPending} className="mt-2">
            {requestReset.isPending ? "Memproses..." : "Kirim Tautan"}
          </Button>
          <Link
            href="/login"
            className="text-center text-sm text-muted-foreground hover:text-foreground"
          >
            Kembali ke halaman masuk
          </Link>
        </form>
      </CardContent>
    </Card>
  );
}

function CompleteResetCard({ token }: { token: string }) {
  const router = useRouter();
  const resetPassword = useResetPassword();
  const [invalidMessage, setInvalidMessage] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CompleteForm>({ resolver: zodResolver(completeFormSchema) });

  const onSubmit = handleSubmit((values) => {
    resetPassword.mutate(
      { token, password: values.password },
      {
        onSuccess: () => router.push("/login"),
        onError: (error) => {
          setInvalidMessage(
            error instanceof ApiError ? error.message : "Tautan tidak berlaku atau kedaluwarsa.",
          );
        },
      },
    );
  }, onFormInvalid);

  if (invalidMessage) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tautan tidak berlaku</CardTitle>
          <CardDescription>{invalidMessage} Minta tautan baru atau hubungi Admin.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Atur Sandi Baru</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="new-password">Sandi Baru</FieldLabel>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              {...register("password")}
            />
            <FieldError errors={errors.password ? [errors.password] : undefined} />
          </Field>
          <Button type="submit" disabled={resetPassword.isPending} className="mt-2">
            {resetPassword.isPending ? "Memproses..." : "Simpan Sandi Baru"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordSwitch />
    </Suspense>
  );
}

function ResetPasswordSwitch() {
  const token = useSearchParams().get("token");
  return token ? <CompleteResetCard token={token} /> : <RequestResetCard />;
}
