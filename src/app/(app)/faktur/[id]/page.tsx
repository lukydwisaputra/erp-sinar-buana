"use client";
import { useParams } from "next/navigation";
import { ReceiptText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useFaktur, useFakturList } from "@/lib/query/faktur";
import { groupFakturByDeal } from "@/lib/faktur";
import { DealTerminCardLive } from "@/components/faktur/deal-termin-card";
import { FakturBuilder } from "@/components/faktur/faktur-builder";

export default function Page() {
  const { id } = useParams<{ id: string }>();
  const decodedId = decodeURIComponent(id);

  const { data: faktur, isLoading } = useFaktur(decodedId);
  const { data: allFakturs } = useFakturList();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <ReceiptText className="size-5 text-muted-foreground" />
          <Skeleton className="h-7 w-64" />
        </div>
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-96 w-full rounded-lg" />
      </div>
    );
  }

  if (!faktur) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <ReceiptText className="size-10 text-muted-foreground/40 mb-4" />
        <p className="font-medium">Faktur tidak ditemukan</p>
        <p className="text-sm text-muted-foreground mt-1">ID: {decodedId}</p>
      </div>
    );
  }

  const lookupKey = faktur.sphId || faktur.id;
  const deal = allFakturs
    ? (groupFakturByDeal(allFakturs).find((d) => d.key === lookupKey) ?? null)
    : null;

  return (
    <div className="space-y-6">
      {deal && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">Status Termin Deal</h2>
          <DealTerminCardLive lookupKey={lookupKey} currentId={faktur.id} placeholder={deal} />
        </section>
      )}
      <FakturBuilder existing={faktur} />
    </div>
  );
}
