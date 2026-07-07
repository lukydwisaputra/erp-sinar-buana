"use client";
import { useParams } from "next/navigation";
import { SlipBuilder } from "@/components/penggajian/slip-builder";

export default function Page() {
  const { batchId, slipId } = useParams<{ batchId: string; slipId: string }>();
  return <SlipBuilder batchId={decodeURIComponent(batchId)} slipId={slipId} />;
}
