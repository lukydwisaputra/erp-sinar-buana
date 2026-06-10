import { notFound } from "next/navigation";
import { getFaktur } from "@/lib/data/faktur";
import { FakturBuilder } from "@/components/faktur/faktur-builder";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const faktur = await getFaktur(decodeURIComponent(id));
  if (!faktur) notFound();
  return <FakturBuilder existing={faktur} />;
}
