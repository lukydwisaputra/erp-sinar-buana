import {
  LayoutDashboard, FileText, FolderKanban, ReceiptText, Wallet,
  ArrowRightLeft, Landmark, Building2, BookOpen, Users, Send,
  Settings, UserCog, Building, type LucideIcon,
} from "lucide-react";

export type NavItem = { label: string; href: string; icon: LucideIcon };
export type NavGroup = { label: string; items: NavItem[] };

export const NAV: NavGroup[] = [
  { label: "Utama", items: [
    { label: "Dasbor", href: "/dasbor", icon: LayoutDashboard },
  ]},
  { label: "Penjualan", items: [
    { label: "Penawaran", href: "/penawaran", icon: FileText },
    { label: "Proyek", href: "/proyek", icon: FolderKanban },
  ]},
  { label: "Keuangan", items: [
    { label: "Faktur", href: "/faktur", icon: ReceiptText },
    { label: "Penggajian", href: "/penggajian", icon: Wallet },
    { label: "Arus Kas", href: "/arus-kas", icon: ArrowRightLeft },
    { label: "Pajak", href: "/pajak", icon: Landmark },
  ]},
  { label: "Master Data", items: [
    { label: "Perusahaan", href: "/perusahaan", icon: Building2 },
    { label: "Katalog Layanan", href: "/katalog", icon: BookOpen },
    { label: "Karyawan", href: "/karyawan", icon: Users },
  ]},
  { label: "Administrasi", items: [
    { label: "Pengiriman Dokumen", href: "/dokumen", icon: Send },
    { label: "Konfigurasi", href: "/konfigurasi", icon: Settings },
    { label: "Pengguna", href: "/pengguna", icon: UserCog },
    { label: "Profil Perusahaan", href: "/profil-perusahaan", icon: Building },
  ]},
];

/** Flat lookup: href → label (for breadcrumb + palette). */
export const NAV_LOOKUP: Record<string, string> = Object.fromEntries(
  NAV.flatMap((g) => g.items.map((i) => [i.href, i.label])),
);
