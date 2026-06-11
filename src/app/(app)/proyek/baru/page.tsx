import { redirect } from "next/navigation";
import { getPenawaran } from "@/lib/data/penawaran";
import { ProyekCreate } from "@/components/proyek/proyek-create";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ sphId?: string }>;
}) {
  const { sphId } = await searchParams;
  if (!sphId) redirect("/penawaran");
  const sph = await getPenawaran(decodeURIComponent(sphId));
  if (!sph || sph.status !== "deal") redirect("/penawaran");
  return <ProyekCreate sph={sph} />;
}
