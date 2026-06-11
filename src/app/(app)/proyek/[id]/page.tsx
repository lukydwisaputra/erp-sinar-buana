import { notFound } from "next/navigation";
import { getProyek } from "@/lib/data/proyek";
import { ProyekDetail } from "@/components/proyek/proyek-detail";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const proyek = await getProyek(id);
  if (!proyek) notFound();
  return <ProyekDetail proyek={proyek} />;
}
