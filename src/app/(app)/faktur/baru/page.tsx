"use client";
import { Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { useProyek } from "@/lib/query/proyek";
import { FakturIndukCreate } from "@/components/faktur/faktur-induk-create";

function FakturBaru() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const proyekId = searchParams.get("proyekId") ?? "";
  const { data: proyek, isLoading } = useProyek(proyekId);

  useEffect(() => {
    if (!proyekId) router.replace("/proyek");
  }, [proyekId, router]);

  if (!proyekId) return null;

  if (isLoading) {
    return (
      <div className="mx-auto max-w-xl space-y-6 px-4 py-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full rounded-lg" />
      </div>
    );
  }

  if (!proyek) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="font-medium">Proyek tidak ditemukan</p>
      </div>
    );
  }

  return <FakturIndukCreate proyek={proyek} />;
}

export default function Page() {
  return (
    <Suspense>
      <FakturBaru />
    </Suspense>
  );
}
