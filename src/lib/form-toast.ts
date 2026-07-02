import { toast } from "sonner";
import type { FieldErrors, FieldValues } from "react-hook-form";

/**
 * Pass as the second argument to react-hook-form's handleSubmit so users get a
 * toast on top of the inline field errors — otherwise a validation failure can
 * look like the button silently did nothing.
 */
export function onFormInvalid<T extends FieldValues>(_errors: FieldErrors<T>): void {
  toast.error("Formulir belum lengkap. Periksa kembali kolom yang ditandai merah.");
}
