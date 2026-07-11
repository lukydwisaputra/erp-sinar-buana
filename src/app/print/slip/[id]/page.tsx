import { notFound } from "next/navigation";
import { guardPrintRequest } from "@/lib/print/guard";
import { getSlipForPrint } from "@/lib/penggajian/service";
import { SlipDocument } from "@/components/penggajian/slip-document";
import { DocumentFooter } from "@/components/shared/document/document-footer";

type RouteContext = {
  params: Promise<{ id: string }>; // payslip id
  searchParams: Promise<{ token?: string }>;
};

export default async function PrintSlipPage({ params, searchParams }: RouteContext) {
  const { id } = await params;
  const { token } = await searchParams;
  await guardPrintRequest(token);

  const result = await getSlipForPrint(id);
  if (!result) notFound();

  return (
    <div className="doc-print">
      <SlipDocument slip={result.slip} periode={result.periode} />
      <div className="doc-print-footer" aria-hidden>
        <DocumentFooter />
      </div>
    </div>
  );
}
