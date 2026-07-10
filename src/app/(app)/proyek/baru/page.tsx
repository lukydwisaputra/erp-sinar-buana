"use client";
import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { useSph } from "@/lib/query/penawaran";
import { ProyekCreate } from "@/components/proyek/proyek-create";

function ProyekBaru() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sphId = searchParams.get("sphId") ?? "";
  const { data: sph, isLoading, isError } = useSph(sphId);

  useEffect(() => {
    if (!sphId) { router.replace("/penawaran"); return; }
    if (!isLoading && (isError || !sph || sph.status !== "deal")) {
      router.replace("/penawaran");
    }
  }, [sphId, isLoading, isError, sph, router]);

  if (!sphId) return null;

  if (isLoading) {
    return (
      <div className="mx-auto max-w-xl space-y-6 px-4 py-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full rounded-lg" />
      </div>
    );
  }

  if (!sph || sph.status !== "deal") return null;

  return <ProyekCreate sph={sph} />;
}

export default function Page() {
  return (
    <Suspense>
      <ProyekBaru />
    </Suspense>
  );
}
