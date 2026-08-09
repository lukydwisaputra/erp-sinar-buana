import { notFound } from "next/navigation";
import { guardPrintRequest } from "@/lib/print/guard";
import { getQuotationForPrint } from "@/lib/penawaran/service";
import { SphDocumentPackage } from "@/components/penawaran/sph-document-package";
import { DocumentFooter } from "@/components/shared/document/document-footer";
import type { SphFormValues } from "@/lib/schemas/penawaran";
import type { Sph } from "@/lib/schemas/penawaran";

type RouteContext = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
};

/** Subset extraction mirrors `sph-builder.tsx`'s private `sphToFormValues()`
 * — kept as a separate small copy rather than exported/shared across the
 * client/server boundary for something this pure and this small. */
function toFormValues(sph: Sph): SphFormValues {
  return {
    perusahaanId: sph.perusahaanId,
    perusahaanNama: sph.perusahaanNama,
    alamat: sph.alamat,
    tanggal: sph.tanggal,
    masaBerlakuAktif: sph.masaBerlakuAktif,
    masaBerlakuHari: sph.masaBerlakuHari,
    kalimatPembuka: sph.kalimatPembuka,
    lampiran: sph.lampiran,
    rincianAktif: sph.rincianAktif,
    items: sph.items,
    termin: sph.termin,
    catatan: sph.catatan,
    ppnAktif: sph.ppnAktif,
    ppnPersen: sph.ppnPersen,
    pph23Aktif: sph.pph23Aktif,
    pph23Persen: sph.pph23Persen,
    jabatanPenerima: sph.jabatanPenerima,
    salutasiPenerima: sph.salutasiPenerima,
    tempat: sph.tempat,
    picAktif: sph.picAktif,
    picNama: sph.picNama,
    picJabatan: sph.picJabatan,
    picSalutation: sph.picSalutation,
    kelengkapan: sph.kelengkapan ?? [],
    useDigitalSignature: sph.useDigitalSignature,
    signatureTemplateId: sph.signatureTemplateId,
  };
}

export default async function PrintSphPage({ params, searchParams }: RouteContext) {
  const { id } = await params;
  const { token } = await searchParams;
  await guardPrintRequest(token);

  const sph = await getQuotationForPrint(id);
  if (!sph) notFound();

  return (
    <div className="doc-print">
      <SphDocumentPackage values={toFormValues(sph)} noSph={sph.number ?? "Draf"} signatureImage={sph.signatureImage} />
      <div className="doc-print-footer" aria-hidden>
        <DocumentFooter />
      </div>
    </div>
  );
}
