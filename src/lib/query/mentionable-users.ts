"use client";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export type MentionableUser = { id: string; nama: string };

export function useMentionableUsers() {
  return useQuery({
    queryKey: ["mentionable-users"],
    queryFn: () => apiClient.get<MentionableUser[]>("/api/mentionable-users"),
  });
}
