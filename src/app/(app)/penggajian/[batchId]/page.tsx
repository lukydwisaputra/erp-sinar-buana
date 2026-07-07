"use client";
import { useParams } from "next/navigation";
import { PenggajianBatchDetail } from "@/components/penggajian/penggajian-batch";

export default function Page() {
  const { batchId } = useParams<{ batchId: string }>();
  return <PenggajianBatchDetail batchId={decodeURIComponent(batchId)} />;
}
