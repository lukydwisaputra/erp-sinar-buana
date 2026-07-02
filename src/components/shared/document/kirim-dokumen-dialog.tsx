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
import { pengirimanConfig } from "@/lib/pengiriman-config";
import { buildPesanWa, buildWaLink } from "@/lib/pengiriman-templates";
import { useCreatePengirimanLog } from "@/lib/query/pengiriman";
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
  onSent?: (channel: ChannelPengiriman) => void;
}

export function KirimDokumenDialog({
  open,
  onOpenChange,
  jenisDokumen,
  dokumenId,
  dokumenNomor,
  tujuanOptions,
  onSent,
}: KirimDokumenDialogProps): React.JSX.Element {
  const [index, setIndex] = React.useState(0);
  const [sendingWa, runSendWa] = usePending();
  const createLog = useCreatePengirimanLog();

  React.useEffect(() => {
    if (open) setIndex(0);
  }, [open]);

  const tujuan = tujuanOptions[index];
  const pesan = tujuan ? buildPesanWa(jenisDokumen, { perusahaan: tujuan.nama, nomor: dokumenNomor }) : "";
  const teleponKosong = !tujuan?.telepon;

  function handleKirimWhatsApp() {
    if (!tujuan) return;
    runSendWa(async () => {
      window.open(buildWaLink(tujuan.telepon, pesan), "_blank");
      await createLog.mutateAsync({
        jenisDokumen, dokumenId, dokumenNomor,
        tujuanNama: tujuan.nama, tujuanKontak: tujuan.telepon, channel: "whatsapp",
      });
      toast.success("Tautan WhatsApp dibuka — lampirkan PDF secara manual.");
      onSent?.("whatsapp");
      onOpenChange(false);
    });
  }

  async function handleKirimEmail() {
    if (!tujuan || !pengirimanConfig.emailTerkonfigurasi) return;
    await createLog.mutateAsync({
      jenisDokumen, dokumenId, dokumenNomor,
      tujuanNama: tujuan.nama, tujuanKontak: tujuan.email, channel: "email",
    });
    toast.success("Email terkirim.");
    onSent?.("email");
    onOpenChange(false);
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
              <span tabIndex={pengirimanConfig.emailTerkonfigurasi ? undefined : 0}>
                <Button disabled={!pengirimanConfig.emailTerkonfigurasi} onClick={handleKirimEmail}>
                  <Mail className="size-4" /> Kirim Email
                </Button>
              </span>
            </TooltipTrigger>
            {!pengirimanConfig.emailTerkonfigurasi && (
              <TooltipContent>Atur akun email pengirim dulu.</TooltipContent>
            )}
          </Tooltip>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
