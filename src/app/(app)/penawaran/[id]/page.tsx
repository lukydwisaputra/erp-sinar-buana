"use client";
import { useParams } from "next/navigation";
import { FileText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useSph } from "@/lib/query/penawaran";
import { SphBuilder } from "@/components/penawaran/sph-builder";

export default function Page() {
  const { id } = useParams<{ id: string }>();
  const decodedId = decodeURIComponent(id);
  const { data: sph, isLoading } = useSph(decodedId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <FileText className="size-5 text-muted-foreground" />
          <Skeleton className="h-7 w-64" />
        </div>
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-96 w-full rounded-lg" />
      </div>
    );
  }

  if (!sph) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <FileText className="size-10 text-muted-foreground/40 mb-4" />
        <p className="font-medium">Penawaran tidak ditemukan</p>
        <p className="text-sm text-muted-foreground mt-1">ID: {decodedId}</p>
      </div>
    );
  }

  return <SphBuilder existing={sph} />;
}
