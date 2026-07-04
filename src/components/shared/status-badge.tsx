import { Badge, badgeVariants } from "@/components/ui/badge";
import type { VariantProps } from "class-variance-authority";

export type StatusBadgeConfig = { label: string; variant: VariantProps<typeof badgeVariants>["variant"] };

/** Config-driven status badge — `map` is a `{ [status]: { label, variant } }`
 * lookup, replacing the near-identical `StatusBadge` component hand-rolled
 * per list page. */
export function StatusBadge<K extends string>({
  status,
  map,
}: {
  status: K;
  map: Record<K, StatusBadgeConfig>;
}) {
  const s = map[status];
  return <Badge variant={s.variant}>{s.label}</Badge>;
}
