import { notFound } from "next/navigation";
import { getKelengkapan } from "@/lib/data/kelengkapan";
import { KelengkapanDetail } from "@/components/kelengkapan/kelengkapan-detail";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const template = await getKelengkapan(decodeURIComponent(id));
  if (!template) notFound();
  return <KelengkapanDetail template={template} />;
}
