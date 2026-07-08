"use client";
import { useParams } from "next/navigation";
import { ClipboardList } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useKelengkapan } from "@/lib/query/kelengkapan";
import { KelengkapanDetail } from "@/components/kelengkapan/kelengkapan-detail";

export default function Page() {
  const { id } = useParams<{ id: string }>();
  const decodedId = decodeURIComponent(id);
  const { data: template, isLoading } = useKelengkapan(decodedId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <ClipboardList className="size-5 text-muted-foreground" />
          <Skeleton className="h-7 w-64" />
        </div>
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <ClipboardList className="size-10 text-muted-foreground/40 mb-4" />
        <p className="font-medium">Template Kelengkapan tidak ditemukan</p>
        <p className="text-sm text-muted-foreground mt-1">ID: {decodedId}</p>
      </div>
    );
  }

  return <KelengkapanDetail template={template} />;
}
