"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { onFormInvalid } from "@/lib/form-toast";
import { useAcceptInvite } from "@/lib/query/session";
import { ApiError } from "@/lib/api-client";

// VR-01.5 baseline policy.
const acceptInviteFormSchema = z.object({
  password: z.string().min(8, "Sandi minimal 8 karakter."),
});
type AcceptInviteForm = z.infer<typeof acceptInviteFormSchema>;

export default function AcceptInvitePage() {
  return (
    <Suspense>
      <AcceptInviteForm />
    </Suspense>
  );
}

function AcceptInviteForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const acceptInvite = useAcceptInvite();
  const [invalidMessage, setInvalidMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AcceptInviteForm>({ resolver: zodResolver(acceptInviteFormSchema) });

  const onSubmit = handleSubmit((values) => {
    if (!token) return;
    acceptInvite.mutate(
      { token, password: values.password },
      {
        onSuccess: () => router.push("/dasbor"),
        onError: (error) => {
          setInvalidMessage(
            error instanceof ApiError ? error.message : "Tautan tidak berlaku atau kedaluwarsa.",
          );
        },
      },
    );
  }, onFormInvalid);

  if (!token || invalidMessage) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tautan tidak berlaku</CardTitle>
          <CardDescription>
            {invalidMessage ?? "Tautan undangan tidak valid."} Minta Admin mengirim ulang
            undangan.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Aktivasi Akun</CardTitle>
        <CardDescription>Buat sandi untuk mulai menggunakan sistem.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="invite-password">Sandi Baru</FieldLabel>
            <Input
              id="invite-password"
              type="password"
              autoComplete="new-password"
              {...register("password")}
            />
            <FieldError errors={errors.password ? [errors.password] : undefined} />
          </Field>
          <Button type="submit" disabled={acceptInvite.isPending} className="mt-2">
            {acceptInvite.isPending ? "Memproses..." : "Aktifkan & Masuk"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
