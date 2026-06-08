import { notFound } from "next/navigation";

import { getPenawaran } from "@/lib/data/penawaran";
import { SphBuilder } from "@/components/penawaran/sph-builder";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sph = await getPenawaran(decodeURIComponent(id));
  if (!sph) notFound();
  return <SphBuilder existing={sph} />;
}
