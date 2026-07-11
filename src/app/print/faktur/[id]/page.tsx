import { notFound } from "next/navigation";
import { guardPrintRequest } from "@/lib/print/guard";
import { getFakturDocumentForPrint } from "@/lib/faktur/service";
import { FakturDocument } from "@/components/faktur/faktur-document";
import { DocumentFooter } from "@/components/shared/document/document-footer";

type RouteContext = {
  params: Promise<{ id: string }>; // installment (termin) id — matches document_deliveries.installment_invoice_id
  searchParams: Promise<{ token?: string }>;
};

export default async function PrintFakturPage({ params, searchParams }: RouteContext) {
  const { id } = await params;
  const { token } = await searchParams;
  await guardPrintRequest(token);

  const result = await getFakturDocumentForPrint(id);
  if (!result) notFound();

  return (
    <div className="doc-print">
      <FakturDocument induk={result.induk} termin={result.termin} />
      <div className="doc-print-footer" aria-hidden>
        <DocumentFooter />
      </div>
    </div>
  );
}
