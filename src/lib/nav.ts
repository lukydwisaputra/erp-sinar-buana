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
// coarse "can see this module in the sidebar" gating. The real boundary is
// server-side (src/lib/auth/rbac.ts requireRole in each Route Handler); this
// is UX only (US-01.6 "Sembunyikan menu tak berhak").
export const NAV: NavGroup[] = [
  { label: "Utama", items: [
    { label: "Dasbor", href: "/dasbor", icon: LayoutDashboard, roles: ALL_ROLES },
  ]},
  { label: "Penjualan", items: [
    { label: "Penawaran", href: "/penawaran", icon: FileText, roles: ALL_ROLES },
    { label: "Proyek", href: "/proyek", icon: FolderKanban, roles: ALL_ROLES },
  ]},
  { label: "Keuangan", items: [
    { label: "Faktur", href: "/faktur", icon: ReceiptText, roles: ["admin", "keuangan", "sales", "tim_teknis"] },
    { label: "Penggajian", href: "/penggajian", icon: Wallet, roles: ["admin", "keuangan", "sales", "tim_teknis"] },
    { label: "Arus Kas", href: "/arus-kas", icon: ArrowRightLeft, roles: ["admin", "keuangan", "viewer"] },
    { label: "Pajak", href: "/pajak", icon: Landmark, roles: ["admin", "keuangan"] },
  ]},
  { label: "Master Data", items: [
    { label: "Perusahaan", href: "/perusahaan", icon: Building2, roles: ALL_ROLES },
    { label: "Katalog Layanan", href: "/katalog", icon: BookOpen, roles: ALL_ROLES },
    { label: "Karyawan", href: "/karyawan", icon: Users, roles: ["admin", "keuangan", "tim_teknis"] },
    { label: "Kelengkapan Administrasi", href: "/kelengkapan", icon: ClipboardList, roles: ALL_ROLES },
  ]},
  { label: "Administrasi", items: [
    { label: "Pengiriman Dokumen", href: "/dokumen", icon: Send, roles: ["admin", "keuangan", "sales"] },
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
