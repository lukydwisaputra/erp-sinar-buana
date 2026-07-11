"use client";
import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/shared/password-input";
import { Button } from "@/components/ui/button";
import { onFormInvalid } from "@/lib/form-toast";
import { useLogin } from "@/lib/query/session";

const loginFormSchema = z.object({
  email: z.string().min(1, "Email wajib diisi.").email("Format email tidak valid."),
  password: z.string().min(1, "Sandi wajib diisi."),
});
type LoginForm = z.infer<typeof loginFormSchema>;

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const login = useLogin();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginFormSchema) });

  const onSubmit = handleSubmit((values) => {
    login.mutate(values, {
      onSuccess: () => {
        router.push(searchParams.get("next") ?? "/dasbor");
      },
    });
  }, onFormInvalid);

  useEffect(() => {
    document.getElementById("login-email")?.focus();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Masuk</CardTitle>
        <CardDescription>Sistem ERP Internal — PT Sinar Buana Mandiri Jaya</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="login-email">Email</FieldLabel>
            <Input id="login-email" type="email" autoComplete="username" {...register("email")} />
            <FieldError errors={errors.email ? [errors.email] : undefined} />
          </Field>
          <Field>
            <FieldLabel htmlFor="login-password">Sandi</FieldLabel>
            <PasswordInput
              id="login-password"
              autoComplete="current-password"
              {...register("password")}
            />
            <FieldError errors={errors.password ? [errors.password] : undefined} />
          </Field>
          <Button type="submit" disabled={login.isPending} className="mt-2">
            {login.isPending ? "Memproses..." : "Masuk"}
          </Button>
          <Link
            href="/reset-password"
            className="text-center text-sm text-muted-foreground hover:text-foreground"
          >
            Lupa sandi?
          </Link>
        </form>
      </CardContent>
    </Card>
  );
}
