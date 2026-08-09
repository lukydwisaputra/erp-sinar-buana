"use client";
import * as React from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { MoneyInput } from "@/components/shared/money-input";

/** Shared cancellation confirm modal — Pembatalan Penawaran client request.
 * Used from SPH, Proyek, and Faktur alike (cancelling any one cascades to the
 * other two); the form itself is identical everywhere, only the submit
 * handler's target id differs per caller. */
export function CancelPembatalanModal({
  open, onOpenChange, onConfirm, isPending,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onConfirm: (input: { alasan: string; biayaAdministrasi?: number }) => void;
  isPending?: boolean;
}) {
  const [alasan, setAlasan] = React.useState("");
  const [biayaAdministrasi, setBiayaAdministrasi] = React.useState<number | undefined>(undefined);
  const [touched, setTouched] = React.useState(false);

  React.useEffect(() => {
    const resetForm = () => { setAlasan(""); setBiayaAdministrasi(undefined); setTouched(false); };
    if (open) resetForm();
  }, [open]);

  const invalid = touched && alasan.trim().length === 0;

  const onSubmit = () => {
    setTouched(true);
    if (alasan.trim().length === 0) return;
    onConfirm({ alasan: alasan.trim(), biayaAdministrasi });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Batalkan?</DialogTitle>
          <DialogDescription>
            SPH, Proyek, dan Faktur Induk yang terkait akan ikut berstatus Dibatalkan.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Field data-invalid={invalid}>
            <FieldLabel>Alasan Pembatalan</FieldLabel>
            <Textarea rows={3} value={alasan} onChange={(e) => setAlasan(e.target.value)} placeholder="Alasan pembatalan…" />
            <FieldError errors={invalid ? [{ message: "Alasan pembatalan wajib diisi." }] : undefined} />
          </Field>
          <Field>
            <FieldLabel>Biaya Administrasi (opsional)</FieldLabel>
            <MoneyInput defaultValue={biayaAdministrasi ?? 0} onValueChange={setBiayaAdministrasi} className="w-full" />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Kembali</Button>
          <Button variant="destructive" loading={isPending} onClick={onSubmit}>Ya, Batalkan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
