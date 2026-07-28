"use client";
import * as React from "react";
import { toast } from "sonner";
import { Mail, MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { usePending } from "@/lib/use-pending";
import { usePengirimanConfig } from "@/lib/query/pengiriman-config";
import { buildWaLink, fillTokens } from "@/lib/pengiriman/token-fill";
import { useCreateWhatsappDelivery, useCreateEmailDelivery } from "@/lib/query/pengiriman";
import type { ChannelPengiriman, JenisDokumenKirim } from "@/lib/schemas/pengiriman";

export interface KirimTujuan {
  nama: string;
  jabatan?: string;
  telepon: string;
  email: string;
}

interface KirimDokumenDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jenisDokumen: JenisDokumenKirim;
  dokumenId: string;
  dokumenNomor: string;
  /** PIC list for SPH/Faktur (may be several); a single locked entry for Slip Gaji. */
  tujuanOptions: KirimTujuan[];
  /**
   * Static placeholder values the caller already has (e.g. nama_perusahaan,
   * jatuh_tempo, periode) — merged in here with the selected recipient's name
   * at {pic} (SPH/Faktur) or {nama_karyawan} (Slip Gaji).
   */
  tokens?: Record<string, string>;
  onSent?: (channel: ChannelPengiriman) => void;
}

export function KirimDokumenDialog({
  open,
  onOpenChange,
  jenisDokumen,
  dokumenId,
  dokumenNomor,
  tujuanOptions,
  tokens = {},
  onSent,
}: KirimDokumenDialogProps): React.JSX.Element {
  const [index, setIndex] = React.useState(0);
  const [sendingWa, runSendWa] = usePending();
  const [sendingEmail, runSendEmail] = usePending();
  const createWhatsapp = useCreateWhatsappDelivery();
  const createEmail = useCreateEmailDelivery();
  const { data: pengirimanConfig } = usePengirimanConfig();
  const emailTerkonfigurasi = pengirimanConfig?.emailAkun?.terkonfigurasi ?? false;

  React.useEffect(() => {
    const resetIndex = () => setIndex(0);
    if (open) resetIndex();
  }, [open]);

  const tujuan = tujuanOptions[index];
  const recipientKey = jenisDokumen === "slip" ? "nama_karyawan" : "pic";
  const docNumberKey = jenisDokumen === "sph" ? "no_sph" : jenisDokumen === "faktur" ? "no_inv" : null;
  const allTokens: Record<string, string> = {
    ...tokens,
    ...(docNumberKey ? { [docNumberKey]: dokumenNomor } : {}),
    ...(tujuan ? { [recipientKey]: tujuan.nama } : {}),
  };

  const waTemplate = pengirimanConfig?.whatsappTemplates[jenisDokumen];
  const pesan = waTemplate ? fillTokens(waTemplate.body, allTokens) : "";
  const teleponKosong = !tujuan?.telepon;

  const emailTemplate = pengirimanConfig?.emailTemplates[jenisDokumen];
  const emailSubjek = emailTemplate ? fillTokens(emailTemplate.subjek ?? "", allTokens) : "";
  const emailBody = emailTemplate ? fillTokens(emailTemplate.body, allTokens) : "";

  function handleKirimWhatsApp() {
    if (!tujuan) return;
    runSendWa(async () => {
      window.open(buildWaLink(tujuan.telepon, pesan), "_blank");
      await createWhatsapp.mutateAsync({
        jenisDokumen, dokumenId, dokumenNomor,
        tujuanNama: tujuan.nama, tujuanKontak: tujuan.telepon,
      });
      toast.success("Tautan WhatsApp dibuka — lampirkan PDF secara manual.");
      onSent?.("whatsapp");
      onOpenChange(false);
    });
  }

  function handleKirimEmail() {
    if (!tujuan || !emailTerkonfigurasi) return;
    runSendEmail(async () => {
      await createEmail.mutateAsync({
        jenisDokumen, dokumenId, dokumenNomor,
        tujuanNama: tujuan.nama, tujuanKontak: tujuan.email,
      });
      toast.success("Email sedang dikirim…");
      onSent?.("email");
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Kirim Dokumen</DialogTitle>
          <DialogDescription className="font-mono">{dokumenNomor}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Field>
            <FieldLabel>Tujuan</FieldLabel>
            {tujuanOptions.length > 1 ? (
              <Select value={String(index)} onValueChange={(v) => setIndex(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tujuanOptions.map((t, i) => (
                    <SelectItem key={i} value={String(i)}>
                      {t.nama}{t.jabatan ? ` — ${t.jabatan}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
                <p className="font-medium">{tujuan?.nama ?? "—"}</p>
                {tujuan?.jabatan && <p className="text-xs text-muted-foreground">{tujuan.jabatan}</p>}
              </div>
            )}
            {jenisDokumen === "slip" && (
              <FieldDescription>Slip gaji hanya dapat dikirim ke karyawan bersangkutan.</FieldDescription>
            )}
          </Field>

          <Field>
            <FieldLabel>Pesan WhatsApp</FieldLabel>
            <Textarea value={pesan} readOnly rows={5} className="resize-none text-sm" />
          </Field>

          {emailTerkonfigurasi && (
            <Field>
              <FieldLabel>Pratinjau Email</FieldLabel>
              <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm font-medium">
                {emailSubjek}
              </div>
              <Textarea value={emailBody} readOnly rows={4} className="resize-none text-sm" />
            </Field>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            loading={sendingWa}
            disabled={teleponKosong}
            title={teleponKosong ? "Nomor tujuan tidak tersedia." : undefined}
            onClick={handleKirimWhatsApp}
          >
            <MessageCircle className="size-4" /> Kirim WhatsApp
          </Button>

          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={emailTerkonfigurasi ? undefined : 0}>
                <Button disabled={!emailTerkonfigurasi} loading={sendingEmail} onClick={handleKirimEmail}>
                  <Mail className="size-4" /> Kirim Email
                </Button>
              </span>
            </TooltipTrigger>
            {!emailTerkonfigurasi && (
              <TooltipContent>Atur akun email pengirim dulu.</TooltipContent>
            )}
          </Tooltip>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
