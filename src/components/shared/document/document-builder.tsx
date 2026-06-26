"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Download, Maximize2, Send, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { BuilderLayout } from "@/components/shared/builder-layout";
import { ScaleToFit } from "@/components/shared/scale-to-fit";
import { DocumentFooter } from "@/components/shared/document/document-footer";
import { usePending } from "@/lib/use-pending";

export function DocumentBuilder({
  title,
  subtitle,
  previewTitle,
  actions,
  form,
  sidePreview,
  doc,
  onKirim,
}: {
  title: React.ReactNode;
  subtitle: string;
  previewTitle: string;
  actions?: React.ReactNode;
  form: React.ReactNode;
  sidePreview: React.ReactNode;
  doc: React.ReactNode;
  onKirim: () => void | Promise<void>;
}): React.JSX.Element {
  const [fs, setFs] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const [sending, runSend] = usePending();
  React.useEffect(() => setMounted(true), []);

  return (
    <>
      <BuilderLayout
        title={title}
        subtitle={subtitle}
        actions={
          <>
            <Button variant="outline" onClick={() => setFs(true)}>
              <Maximize2 className="size-4" /> Pratinjau Layar Penuh
            </Button>
            {actions}
          </>
        }
        form={form}
        preview={sidePreview}
      />

      <Dialog open={fs} onOpenChange={setFs}>
        <DialogContent showCloseButton={false} className="flex h-[92vh] w-[92vw] flex-col overflow-hidden p-0 !max-w-[92vw]">
          <DialogTitle className="sr-only">{previewTitle}</DialogTitle>
          <div className="flex shrink-0 items-center justify-end gap-2 border-b border-border bg-background px-4 py-2">
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Download className="size-4" /> Unduh
            </Button>
            <Button size="sm" loading={sending} onClick={() => runSend(async () => { await onKirim(); setFs(false); })}>
              <Send className="size-4" /> Kirim
            </Button>
            <Button variant="ghost" size="icon" aria-label="Tutup" onClick={() => setFs(false)}>
              <X className="size-4" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto bg-muted/40 p-4 sm:p-6">
            <div className="mx-auto max-w-[210mm]">
              <ScaleToFit>{doc}</ScaleToFit>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {mounted &&
        createPortal(
          <div className="doc-print hidden print:block">
            {doc}
            <div className="doc-print-footer" aria-hidden>
              <DocumentFooter />
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
