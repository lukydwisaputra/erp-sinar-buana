"use client";
import * as React from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ArrowLeft, ClipboardList, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScaleToFit } from "@/components/shared/scale-to-fit";
import { DocumentFooter } from "@/components/shared/document/document-footer";
import { SphKelengkapanPage } from "@/components/penawaran/sph-kelengkapan-page";
import type { KelengkapanTemplate } from "@/lib/schemas/kelengkapan";
import type { SphKelengkapan } from "@/lib/schemas/penawaran";

export function KelengkapanDetail({ template }: { template: KelengkapanTemplate }) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    const markMounted = () => setMounted(true);
    markMounted();
  }, []);

  const preview: SphKelengkapan = {
    templateId: template.id,
    nama: template.nama,
    items: template.items.map((item) => ({ persyaratan: item.persyaratan, status: "" as const, keterangan: "" })),
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild className="size-8">
            <Link href="/kelengkapan"><ArrowLeft className="size-4" /></Link>
          </Button>
          <ClipboardList className="size-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold tracking-tight">{template.nama}</h1>
        </div>

        <div className="overflow-hidden rounded-lg border border-border">
          <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-3">
            <div>
              <p className="font-mono text-sm font-medium">{template.number ?? "—"}</p>
              <p className="text-xs text-muted-foreground">{template.items.length} persyaratan</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Download className="size-4" /> Unduh
            </Button>
          </div>
          <div className="p-4">
            <div className="mx-auto max-w-198.5">
              <ScaleToFit>
                <SphKelengkapanPage kelengkapan={preview} />
              </ScaleToFit>
            </div>
          </div>
        </div>
      </div>

      {mounted && createPortal(
        <div className="doc-print hidden print:block">
          <SphKelengkapanPage kelengkapan={preview} />
          <div className="doc-print-footer" aria-hidden>
            <DocumentFooter />
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
