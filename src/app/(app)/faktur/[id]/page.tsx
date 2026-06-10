import { notFound } from "next/navigation";
import { getFaktur, listFaktur } from "@/lib/data/faktur";
import { groupFakturByDeal } from "@/lib/faktur";
import { DealTerminCard } from "@/components/faktur/deal-termin-card";
import { FakturBuilder } from "@/components/faktur/faktur-builder";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const faktur = await getFaktur(decodeURIComponent(id));
  if (!faktur) notFound();

  // The deal's full termin schedule (status of every termin + per-termin actions).
  const all = await listFaktur();
  const deal = groupFakturByDeal(all).find((d) => d.key === (faktur.sphId || faktur.id)) ?? null;

  return (
    <div className="space-y-6">
      {deal && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">Status Termin Deal</h2>
          <DealTerminCard deal={deal} currentId={faktur.id} />
        </section>
      )}
      <FakturBuilder existing={faktur} />
    </div>
  );
}
