"use client";
import { useParams } from "next/navigation";
import { ReceiptText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useFaktur } from "@/lib/query/faktur";
import { FakturIndukDetail } from "@/components/faktur/faktur-induk-detail";

export default function Page() {
  const { id } = useParams<{ id: string }>();
  const decodedId = decodeURIComponent(id);
  const { data: induk, isLoading } = useFaktur(decodedId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <ReceiptText className="size-5 text-muted-foreground" />
          <Skeleton className="h-7 w-64" />
        </div>
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  if (!induk) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <ReceiptText className="size-10 text-muted-foreground/40 mb-4" />
        <p className="font-medium">Faktur Induk tidak ditemukan</p>
        <p className="text-sm text-muted-foreground mt-1">ID: {decodedId}</p>
      </div>
    );
  }

  return <FakturIndukDetail induk={induk} />;
}
