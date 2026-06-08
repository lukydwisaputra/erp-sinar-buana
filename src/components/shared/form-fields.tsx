"use client";
import * as React from "react";
import { Field, FieldLabel, FieldDescription, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/shared/phone-input";

/** Shape of a react-hook-form field error (only `message` is read here). */
type FieldErr = { message?: string } | undefined;
const errs = (e: FieldErr) => (e ? [e] : undefined);

/**
 * NPWP field — consistent across all Master Data forms: numeric input, hard
 * 16-digit cap, fixed placeholder + hint. Spread `{...register("npwp")}`.
 */
export function NpwpField({
  id,
  label = "NPWP",
  error,
  ...props
}: { id: string; label?: string; error?: FieldErr } & React.ComponentProps<typeof Input>) {
  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        inputMode="numeric"
        maxLength={16}
        placeholder="0123456789012345"
        aria-invalid={!!error}
        {...props}
      />
      <FieldDescription>16 digit angka tanpa titik atau spasi.</FieldDescription>
      <FieldError errors={errs(error)} />
    </Field>
  );
}

/**
 * No. HP field — leading +62 country selector + local number input + hint.
 * Spread `{...register("telepon")}`.
 */
export function PhoneField({
  id,
  label = "No. HP",
  error,
  ...props
}: { id: string; label?: string; error?: FieldErr } & React.ComponentProps<"input">) {
  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <PhoneInput id={id} placeholder="812-3456-7890" aria-invalid={!!error} {...props} />
      <FieldDescription>Tanpa angka 0 di depan, mis: 812-3456-7890.</FieldDescription>
      <FieldError errors={errs(error)} />
    </Field>
  );
}

/**
 * Email field — type=email, fixed placeholder, no description (placeholder is
 * enough). Spread `{...register("email")}`.
 */
export function EmailField({
  id,
  label = "Email",
  error,
  ...props
}: { id: string; label?: string; error?: FieldErr } & React.ComponentProps<typeof Input>) {
  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        type="email"
        inputMode="email"
        placeholder="nama@domain.co.id"
        aria-invalid={!!error}
        {...props}
      />
      <FieldError errors={errs(error)} />
    </Field>
  );
}
