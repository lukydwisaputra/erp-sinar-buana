import { FakturBuilder } from "@/components/faktur/faktur-builder";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ deal?: string; termin?: string }>;
}) {
  const sp = await searchParams;
  return (
    <FakturBuilder
      initialSphId={sp.deal}
      initialTerminIndex={sp.termin != null ? Number(sp.termin) : undefined}
    />
  );
}
