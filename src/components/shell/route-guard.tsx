"use client";
import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/lib/query/session";
import { findNavItemForPath, firstAllowedPath } from "@/lib/nav";

/** Bounces a role off any page its NAV entry doesn't list, so hiding a menu
 * item (US-01.6) can't be defeated by typing the URL in directly. This is a
 * UX-layer redirect on top of the real server-side boundary (requireRole in
 * each Route Handler, RLS underneath) — it stops the page shell from
 * rendering at all for a disallowed role, it doesn't grant or revoke data
 * access. */
export function RouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, isLoading } = useSession();

  const item = findNavItemForPath(pathname);
  const blocked = !isLoading && !!session && !!item && !item.roles.includes(session.role);

  React.useEffect(() => {
    if (blocked) router.replace(firstAllowedPath(session!.role));
  }, [blocked, session, router]);

  if (blocked) return null;
  return <>{children}</>;
}
