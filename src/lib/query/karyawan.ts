"use client";
import { useQuery } from "@tanstack/react-query";
import { listKaryawan, type ListKaryawanParams } from "@/lib/data/karyawan";

export function useKaryawanList(params: ListKaryawanParams = {}) {
  return useQuery({ queryKey: ["karyawan", params], queryFn: () => listKaryawan(params) });
}
