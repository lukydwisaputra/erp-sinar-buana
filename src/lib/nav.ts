import {
  LayoutDashboard, FileText, FolderKanban, ReceiptText, Wallet,
  ArrowRightLeft, Landmark, Building2, BookOpen, Users, Send,
  Settings, UserCog, Building, ClipboardList, type LucideIcon,
} from "lucide-react";
import type { AppRole } from "@/lib/schemas/pengguna";

const ALL_ROLES: AppRole[] = ["admin", "keuangan", "sales", "tim_teknis", "viewer"];

export type NavItem = { label: string; href: string; icon: LucideIcon; roles: AppRole[] };
export type NavGroup = { label: string; items: NavItem[] };

// Role lists follow the RBAC matrix (planning/prd/02-peran-rbac.md §2.2) —
// "can see this module" gating. Data access is still enforced server-side
// (src/lib/auth/rbac.ts requireRole in each Route Handler) — this list is
// what drives both the sidebar filter (US-01.6) AND <RouteGuard>'s
// direct-URL check below, so a role hidden from a menu can't just type the
// URL in and land on the page anyway.
export const NAV: NavGroup[] = [
  { label: "Utama", items: [
    { label: "Dasbor", href: "/dasbor", icon: LayoutDashboard, roles: ["admin", "keuangan"] },
  ]},
  { label: "Penjualan", items: [
    { label: "Penawaran", href: "/penawaran", icon: FileText, roles: ALL_ROLES },
    { label: "Proyek", href: "/proyek", icon: FolderKanban, roles: ALL_ROLES },
  ]},
  { label: "Keuangan", items: [
    { label: "Faktur", href: "/faktur", icon: ReceiptText, roles: ["admin", "keuangan", "viewer"] },
    { label: "Penggajian", href: "/penggajian", icon: Wallet, roles: ["admin", "keuangan", "tim_teknis"] },
    { label: "Arus Kas", href: "/arus-kas", icon: ArrowRightLeft, roles: ["admin", "keuangan"] },
    { label: "Pajak", href: "/pajak", icon: Landmark, roles: ["admin", "keuangan"] },
  ]},
  // Sidebar-only: hidden from every non-admin role. Non-admin roles still
  // reach the underlying data via other pages/APIs that share these same
  // list endpoints (Faktur Induk detail, Proyek detail/list, SPH form,
  // Penggajian's create-payslip form) — this is UX-only, not a backend gate.
  { label: "Master Data", items: [
    { label: "Perusahaan", href: "/perusahaan", icon: Building2, roles: ["admin"] },
    { label: "Katalog Layanan", href: "/katalog", icon: BookOpen, roles: ["admin"] },
    { label: "Karyawan", href: "/karyawan", icon: Users, roles: ["admin"] },
    { label: "Kelengkapan Administrasi", href: "/kelengkapan", icon: ClipboardList, roles: ["admin"] },
  ]},
  { label: "Administrasi", items: [
    { label: "Pengiriman Dokumen", href: "/dokumen", icon: Send, roles: ["admin"] },
    { label: "Konfigurasi", href: "/konfigurasi", icon: Settings, roles: ["admin"] },
    { label: "Pengguna", href: "/pengguna", icon: UserCog, roles: ["admin"] },
    { label: "Profil Perusahaan", href: "/profil-perusahaan", icon: Building, roles: ["admin"] },
  ]},
];

/** Flat lookup: href → label (for breadcrumb + palette). */
export const NAV_LOOKUP: Record<string, string> = Object.fromEntries(
  NAV.flatMap((g) => g.items.map((i) => [i.href, i.label])),
);

/** Sidebar/palette filtering (US-01.6). */
export function navForRole(role: AppRole | undefined): NavGroup[] {
  if (!role) return [];
  return NAV.map((group) => ({
    ...group,
    items: group.items.filter((item) => item.roles.includes(role)),
  })).filter((group) => group.items.length > 0);
}

const NAV_ITEMS = NAV.flatMap((g) => g.items);

/** Matches a pathname to its NAV entry by first path segment, so nested/
 * dynamic routes (`/faktur/123/edit`) resolve to the same item as their
 * listing page (`/faktur`). Routes with no NAV entry (`/profil`, `/dasbor`'s
 * own sub-paths, `/login`, etc.) return undefined — RouteGuard treats that
 * as unrestricted. */
export function findNavItemForPath(pathname: string): NavItem | undefined {
  const firstSegment = "/" + (pathname.split("/").filter(Boolean)[0] ?? "");
  return NAV_ITEMS.find((item) => item.href === firstSegment);
}

/** Where to send a role bounced off a page it can't access — its own first
 * available menu item, or `/profil` (always reachable) if it has none. */
export function firstAllowedPath(role: AppRole): string {
  for (const group of navForRole(role)) {
    if (group.items.length > 0) return group.items[0].href;
  }
  return "/profil";
}
