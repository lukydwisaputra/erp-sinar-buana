# Frontend Prototype — Phase 1 (App Foundation) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the authenticated app shell (sidebar + top bar + content area) and the typed mock-data layer, so Phase 2 module screens drop into a working, navigable application.

**Architecture:** A Next.js App Router **route group `(app)`** carries the shell layout (shadcn `sidebar` + a top bar) around a content slot; every module gets a placeholder route so navigation works end-to-end. A **mock-data layer** (`lib/schemas` Zod · `lib/fixtures` seeded data · `lib/data` async accessors mirroring the future API · `lib/query` TanStack Query hooks) is proven with **one worked example** (Master Data → Perusahaan) rendered through the reusable `DataTable` with loading/empty/error states.

**Tech Stack:** TypeScript · Next.js App Router · shadcn/ui (`sidebar`) · **TanStack Query** · Zod · existing design-system components (DataTable, EmptyState, ErrorState, ThemeToggle, command palette) · Lucide · Vitest (logic only).

**Scope:** Phase 1 only (spec [§5 Phase 1, F-01→F-05](../specs/2026-06-07-frontend-prototype-design.md)). Phase 2 (the ~55 screens) is a later plan. This builds on the completed Phase 0 design system (branch history).

**Verification model:** Shell/visual tasks → `npm run build` clean + render check (both themes) at the human gate. The mock-data accessor gets a small Vitest test (Zod parse returns valid rows). Every task ends in a commit. UI copy is Bahasa Indonesia; tokens only; no RBAC (every nav item visible — prototype).

**Already done in Phase 0 (do NOT redo):** scaffold, `src/app/layout.tsx` (fonts + next-themes ThemeProvider + global `<Toaster/>`), tokens, `ThemeToggle`, the `command`/`kbd` primitives, and reusable `DataTable` / `EmptyState` / `ErrorState` / `MoneyInput` in `src/components/shared/`. The `sidebar` primitive was intentionally deferred to here (F-02).

---

## File Structure

```
src/
  app/
    page.tsx                      redirect "/" → "/dasbor" (was → /design-system)
    providers.tsx                 "use client": QueryClientProvider + TooltipProvider
    (app)/
      layout.tsx                  shell: <Providers> + SidebarProvider + AppSidebar + TopBar + content slot
      dasbor/page.tsx             placeholder
      penawaran/page.tsx          placeholder
      proyek/page.tsx             placeholder
      faktur/page.tsx             placeholder
      penggajian/page.tsx         placeholder
      arus-kas/page.tsx           placeholder
      pajak/page.tsx              placeholder
      perusahaan/page.tsx         WORKED EXAMPLE (uses usePerusahaanList + DataTable)
      katalog/page.tsx            placeholder
      karyawan/page.tsx           placeholder
      dokumen/page.tsx            placeholder
      konfigurasi/page.tsx        placeholder
      pengguna/page.tsx           placeholder
      profil-perusahaan/page.tsx  placeholder
    design-system/                (unchanged — stays outside the (app) group, no shell)
  components/
    shell/
      app-sidebar.tsx             grouped nav, active state, collapsible icon rail
      top-bar.tsx                 sidebar trigger + breadcrumb + ⌘K + theme toggle + user menu
      command-palette.tsx         global ⌘K palette (nav actions), app-wide keydown
      page-placeholder.tsx        reusable "module coming soon" placeholder
  lib/
    nav.ts                        typed nav groups/items (label, href, icon) — single source for sidebar+breadcrumb+palette
    data/_delay.ts                delay() latency helper
    schemas/perusahaan.ts         Zod schema + Perusahaan type
    fixtures/perusahaan.ts        seeded realistic companies
    data/perusahaan.ts            listPerusahaan()/getPerusahaan() (delay + Zod parse)
    query/perusahaan.ts           usePerusahaanList() TanStack hook
    __tests__/perusahaan-data.test.ts
```

---

## Task 1: Nav config + providers (TanStack Query + Tooltip) — F-01

**Files:** Create `src/lib/nav.ts`, `src/app/providers.tsx`. Install `@tanstack/react-query`.

- [ ] **Step 1: Install TanStack Query**

```bash
npm install @tanstack/react-query
```

- [ ] **Step 2: Nav config** — `src/lib/nav.ts` (single source of truth for sidebar, breadcrumb, and command palette)

```ts
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
```

- [ ] **Step 3: Providers** — `src/app/providers.tsx`

```tsx
"use client";
import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 60_000, refetchOnWindowFocus: false } },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
    </QueryClientProvider>
  );
}
```

- [ ] **Step 4: Verify** — `npm run build` (no type errors; nothing renders these yet — Task 4 wires Providers). Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(shell): nav config + TanStack Query/Tooltip providers (F-01)"
```

---

## Task 2: App sidebar — F-02

**Files:** Install `sidebar`. Create `src/components/shell/app-sidebar.tsx`.

- [ ] **Step 1: Install the sidebar primitive**

```bash
npx shadcn@latest add sidebar
```
Then READ `src/components/ui/sidebar.tsx` to confirm the exported parts (`SidebarProvider`, `Sidebar`, `SidebarHeader`, `SidebarContent`, `SidebarGroup`, `SidebarGroupLabel`, `SidebarMenu`, `SidebarMenuItem`, `SidebarMenuButton`, `SidebarFooter`, `SidebarRail`, `SidebarInset`, `SidebarTrigger`, `useSidebar`). Adapt the code below to the real names if they differ.

- [ ] **Step 2: App sidebar** — `src/components/shell/app-sidebar.tsx`

```tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Leaf } from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupLabel, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarRail,
} from "@/components/ui/sidebar";
import { NAV } from "@/lib/nav";

export function AppSidebar() {
  const pathname = usePathname();
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="flex aspect-square size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Leaf className="size-4" />
          </div>
          <div className="grid flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
            <span className="truncate text-sm font-semibold">Sinar Buana</span>
            <span className="truncate text-xs text-muted-foreground">ERP Internal</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {NAV.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarMenu>
              {group.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
```

- [ ] **Step 3: Verify** — `npm run build` (still nothing renders it; type-check only). Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(shell): app sidebar with grouped nav + active state + icon rail (F-02)"
```

---

## Task 3: Top bar + global command palette — F-03

**Files:** Create `src/components/shell/top-bar.tsx`, `src/components/shell/command-palette.tsx`. Uses existing `breadcrumb`, `dropdown-menu`, `avatar`, `command`, `kbd`, `button`, `separator`, `ThemeToggle`.

- [ ] **Step 1: Global command palette** — `src/components/shell/command-palette.tsx`

```tsx
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { NAV } from "@/lib/nav";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const go = (href: string) => { setOpen(false); router.push(href); };

  return (
    <CommandDialog open={open} onOpenChange={setOpen} title="Perintah" description="Cari halaman atau aksi">
      <CommandInput placeholder="Cari halaman…" />
      <CommandList>
        <CommandEmpty>Tidak ada hasil.</CommandEmpty>
        {NAV.map((group) => (
          <CommandGroup key={group.label} heading={group.label}>
            {group.items.map((item) => (
              <CommandItem key={item.href} value={item.label} onSelect={() => go(item.href)}>
                <item.icon className="mr-2 size-4" />
                {item.label}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
```

- [ ] **Step 2: Top bar** — `src/components/shell/top-bar.tsx`

```tsx
"use client";
import { usePathname } from "next/navigation";
import { LogOut, Search, User } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Kbd } from "@/components/ui/kbd";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/design-system/theme-toggle";
import { NAV_LOOKUP } from "@/lib/nav";

function useCurrentLabel() {
  const pathname = usePathname();
  const base = "/" + (pathname.split("/")[1] ?? "");
  return NAV_LOOKUP[base] ?? "Beranda";
}

export function TopBar() {
  const current = useCurrentLabel();
  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/95 px-4 backdrop-blur">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-1 h-5" />
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbPage>{current}</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="ml-auto flex items-center gap-1.5">
        <Button variant="outline" size="sm" className="gap-2 text-muted-foreground"
          onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}>
          <Search className="size-4" /> Cari <Kbd>⌘K</Kbd>
        </Button>
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full" aria-label="Menu pengguna">
              <Avatar className="size-8"><AvatarFallback>BS</AvatarFallback></Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>
              <div className="grid">
                <span className="text-sm font-medium">Budi Santoso</span>
                <span className="text-xs text-muted-foreground">Admin / Owner</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem><User className="mr-2 size-4" /> Profil</DropdownMenuItem>
            <DropdownMenuItem variant="destructive"><LogOut className="mr-2 size-4" /> Keluar</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
```
NOTE: the "Cari" button dispatches a synthetic ⌘K keydown so the global `CommandPalette` listener opens it (keeps one source of truth for the palette). If the real `Kbd` export differs (e.g. `KbdGroup`), adapt to the generated `src/components/ui/kbd.tsx`.

- [ ] **Step 3: Verify** — `npm run build`. Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(shell): top bar (breadcrumb, search ⌘K, theme, user menu) + global command palette (F-03)"
```

---

## Task 4: App shell layout + module route placeholders — F-04

**Files:** Create `src/app/(app)/layout.tsx`, `src/components/shell/page-placeholder.tsx`, and one `page.tsx` per module route. Modify `src/app/page.tsx`.

- [ ] **Step 1: Reusable placeholder** — `src/components/shell/page-placeholder.tsx`

```tsx
import { Construction, type LucideIcon } from "lucide-react";

export function PagePlaceholder({ title, icon: Icon = Construction, note }: {
  title: string; icon?: LucideIcon; note?: string;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <Icon className="size-6 text-muted-foreground" />
      </div>
      <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        {note ?? "Layar ini akan dibangun pada Fase 2 prototipe."}
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Shell layout** — `src/app/(app)/layout.tsx`

```tsx
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Providers } from "@/app/providers";
import { AppSidebar } from "@/components/shell/app-sidebar";
import { TopBar } from "@/components/shell/top-bar";
import { CommandPalette } from "@/components/shell/command-palette";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <TopBar />
          <main className="flex-1 p-4 md:p-6">{children}</main>
        </SidebarInset>
        <CommandPalette />
      </SidebarProvider>
    </Providers>
  );
}
```

- [ ] **Step 3: Redirect home to the dashboard** — replace `src/app/page.tsx`

```tsx
import { redirect } from "next/navigation";
export default function Home() { redirect("/dasbor"); }
```

- [ ] **Step 4: Create placeholder pages** for every route EXCEPT `perusahaan` (Task 5 builds that for real). Create each file with the matching title + icon. Example `src/app/(app)/dasbor/page.tsx`:

```tsx
import { LayoutDashboard } from "lucide-react";
import { PagePlaceholder } from "@/components/shell/page-placeholder";
export default function Page() {
  return <PagePlaceholder title="Dasbor" icon={LayoutDashboard} />;
}
```
Repeat for: `penawaran` (FileText), `proyek` (FolderKanban), `faktur` (ReceiptText), `penggajian` (Wallet), `arus-kas` (ArrowRightLeft), `pajak` (Landmark), `katalog` (BookOpen), `karyawan` (Users), `dokumen` (Send), `konfigurasi` (Settings), `pengguna` (UserCog), `profil-perusahaan` (Building) — each importing its Lucide icon and passing the Bahasa-Indonesia title from `NAV` (Penawaran, Proyek, Faktur, Penggajian, Arus Kas, Pajak, Katalog Layanan, Karyawan, Pengiriman Dokumen, Konfigurasi, Pengguna, Profil Perusahaan).

- [ ] **Step 5: Verify** — `npm run dev`, click through every sidebar item: each navigates, the breadcrumb updates, the active nav item highlights, the sidebar collapses to an icon rail (toggle), ⌘K opens the palette and jumping works, theme toggle works, user menu opens. Then `npm run build` — expected exit 0, all `(app)/*` routes listed. Kill any dev server before finishing.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(shell): app shell layout + module route placeholders, home → /dasbor (F-04)"
```

---

## Task 5: Mock-data layer + worked example (Perusahaan) — F-05

**Files:** Create `src/lib/data/_delay.ts`, `src/lib/schemas/perusahaan.ts`, `src/lib/fixtures/perusahaan.ts`, `src/lib/data/perusahaan.ts`, `src/lib/query/perusahaan.ts`, `src/app/(app)/perusahaan/page.tsx`, `src/lib/__tests__/perusahaan-data.test.ts`.

- [ ] **Step 1: Latency helper** — `src/lib/data/_delay.ts`

```ts
/** Simulate network latency so loading skeletons are visible in the prototype. */
export function delay(ms = 600): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

- [ ] **Step 2: Zod schema** — `src/lib/schemas/perusahaan.ts`

```ts
import { z } from "zod";

export const perusahaanStatus = z.enum(["aktif", "nonaktif"]);

export const perusahaanSchema = z.object({
  id: z.string(),
  nama: z.string(),
  npwp: z.string(),
  pic: z.string(),
  telepon: z.string(),
  email: z.string().email(),
  kota: z.string(),
  status: perusahaanStatus,
});

export type Perusahaan = z.infer<typeof perusahaanSchema>;
```

- [ ] **Step 3: Fixtures** — `src/lib/fixtures/perusahaan.ts`

```ts
import type { Perusahaan } from "@/lib/schemas/perusahaan";

export const perusahaanFixtures: Perusahaan[] = [
  { id: "PRSH-001", nama: "PT Maju Bersama Industri", npwp: "01.234.567.8-901.000", pic: "Andi Wijaya", telepon: "021-5550101", email: "andi@majubersama.co.id", kota: "Jakarta", status: "aktif" },
  { id: "PRSH-002", nama: "CV Sumber Rejeki Pangan", npwp: "02.345.678.9-012.000", pic: "Siti Rahayu", telepon: "022-5550202", email: "siti@sumberrejeki.co.id", kota: "Bandung", status: "aktif" },
  { id: "PRSH-003", nama: "PT Karya Logam Nusantara", npwp: "03.456.789.0-123.000", pic: "Budi Santoso", telepon: "031-5550303", email: "budi@karyalogam.co.id", kota: "Surabaya", status: "aktif" },
  { id: "PRSH-004", nama: "PT Hijau Lestari Permai", npwp: "04.567.890.1-234.000", pic: "Dewi Lestari", telepon: "024-5550404", email: "dewi@hijaulestari.co.id", kota: "Semarang", status: "nonaktif" },
  { id: "PRSH-005", nama: "CV Bahari Sentosa", npwp: "05.678.901.2-345.000", pic: "Rudi Hartono", telepon: "0361-5550505", email: "rudi@baharisentosa.co.id", kota: "Denpasar", status: "aktif" },
  { id: "PRSH-006", nama: "PT Cahaya Teknik Mandiri", npwp: "06.789.012.3-456.000", pic: "Maya Putri", telepon: "061-5550606", email: "maya@cahayateknik.co.id", kota: "Medan", status: "aktif" },
];
```

- [ ] **Step 4: Data accessor (mirrors the future API contract)** — `src/lib/data/perusahaan.ts`

```ts
import { delay } from "@/lib/data/_delay";
import { perusahaanFixtures } from "@/lib/fixtures/perusahaan";
import { perusahaanSchema, type Perusahaan } from "@/lib/schemas/perusahaan";

export type ListPerusahaanParams = { q?: string };

/** Future-API shape: returns Zod-validated rows after a simulated delay. */
export async function listPerusahaan(params: ListPerusahaanParams = {}): Promise<Perusahaan[]> {
  await delay();
  const rows = perusahaanSchema.array().parse(perusahaanFixtures);
  if (!params.q) return rows;
  const q = params.q.toLowerCase();
  return rows.filter((r) => r.nama.toLowerCase().includes(q) || r.pic.toLowerCase().includes(q));
}

export async function getPerusahaan(id: string): Promise<Perusahaan | null> {
  await delay(300);
  const row = perusahaanFixtures.find((r) => r.id === id);
  return row ? perusahaanSchema.parse(row) : null;
}
```

- [ ] **Step 5: Failing test** — `src/lib/__tests__/perusahaan-data.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { listPerusahaan, getPerusahaan } from "@/lib/data/perusahaan";

describe("listPerusahaan", () => {
  it("returns all seeded rows, each matching the schema shape", async () => {
    const rows = await listPerusahaan();
    expect(rows.length).toBeGreaterThanOrEqual(6);
    expect(rows[0]).toMatchObject({ id: expect.any(String), nama: expect.any(String), status: expect.stringMatching(/aktif|nonaktif/) });
  });
  it("filters by query on nama/pic", async () => {
    const rows = await listPerusahaan({ q: "maju" });
    expect(rows).toHaveLength(1);
    expect(rows[0].nama).toContain("Maju");
  });
});

describe("getPerusahaan", () => {
  it("returns a row by id", async () => {
    expect((await getPerusahaan("PRSH-001"))?.nama).toContain("Maju");
  });
  it("returns null for unknown id", async () => {
    expect(await getPerusahaan("NOPE")).toBeNull();
  });
});
```

- [ ] **Step 6: Run, verify FAIL** — `npm test` → FAIL ("Cannot find module '@/lib/data/perusahaan'" if run before Step 4 lands; if Step 4 already exists, the tests should PASS — that's acceptable since the accessor is deterministic). Confirm the suite executes.

- [ ] **Step 7: Run, verify PASS** — `npm test` → all green (existing 13 + 4 new = 17).

- [ ] **Step 8: TanStack Query hook** — `src/lib/query/perusahaan.ts`

```ts
"use client";
import { useQuery } from "@tanstack/react-query";
import { listPerusahaan, type ListPerusahaanParams } from "@/lib/data/perusahaan";

export function usePerusahaanList(params: ListPerusahaanParams = {}) {
  return useQuery({
    queryKey: ["perusahaan", params],
    queryFn: () => listPerusahaan(params),
  });
}
```

- [ ] **Step 9: Worked-example page** — `src/app/(app)/perusahaan/page.tsx` (the end-to-end pattern Phase 2 replicates: hook → DataTable with loading/empty/error)

```tsx
"use client";
import type { ColumnDef } from "@tanstack/react-table";
import { Building2 } from "lucide-react";
import { DataTable } from "@/components/shared/data-table";
import { ErrorState } from "@/components/shared/error-state";
import { Badge } from "@/components/ui/badge";
import { usePerusahaanList } from "@/lib/query/perusahaan";
import type { Perusahaan } from "@/lib/schemas/perusahaan";

const columns: ColumnDef<Perusahaan>[] = [
  { accessorKey: "id", header: "ID", meta: { mono: true } },
  { accessorKey: "nama", header: "Nama Perusahaan" },
  { accessorKey: "pic", header: "PIC" },
  { accessorKey: "kota", header: "Kota" },
  {
    accessorKey: "status", header: "Status",
    cell: ({ row }) => {
      const s = row.original.status;
      return <Badge variant={s === "aktif" ? "success" : "info"}>{s === "aktif" ? "Aktif" : "Nonaktif"}</Badge>;
    },
  },
];

export default function PerusahaanPage() {
  const { data, isLoading, isError, refetch } = usePerusahaanList();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Building2 className="size-5 text-muted-foreground" />
        <h1 className="text-xl font-semibold tracking-tight">Perusahaan</h1>
      </div>
      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <DataTable
          columns={columns}
          data={data ?? []}
          loading={isLoading}
          searchColumn="nama"
          emptyMessage="Belum ada perusahaan"
        />
      )}
    </div>
  );
}
```
IMPORTANT: confirm the actual `DataTable` prop names by reading `src/components/shared/data-table.tsx` (from Phase 0 it exposes `columns`, `data`, `loading`, `error`, `onRetry`, `searchColumn`/`filterColumn`, `filterOptions`, `emptyMessage`, `pageSizeOptions`, `initialPageSize`). Adapt the props above to the real interface. Use the `meta: { align, mono }` augmentation that Phase 0 added.

- [ ] **Step 10: Verify** — `npm run dev`, open `/perusahaan`: a loading skeleton shows ~600ms, then 6 company rows with status badges, a working name filter + pagination. Toggle dark mode. `npm run build` → exit 0. `npm test` → 17 pass. Kill the dev server.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat(data): mock-data layer (schema/fixtures/accessor/query) + Perusahaan worked example (F-05)"
```

---

## Task 6: Human review gate — F-04/F-05 walkthrough

- [ ] **Step 1:** `npm run dev`. Present the running app: navigate all modules (placeholders), exercise the sidebar collapse, breadcrumb, ⌘K palette, theme toggle, user menu, and the **live Perusahaan table** (loading → data → filter → pagination, both themes).
- [ ] **Step 2:** Capture feedback. Confirm the shell + data pattern are right before Phase 2 builds ~55 screens on top. Any fix → address before closing Phase 1.

---

## Self-Review (completed)

- **Spec coverage:** F-01 (routing skeleton + providers) → Tasks 1 & 4; F-02 (sidebar) → Task 2; F-03 (top bar) → Task 3; F-04 (shell layout) → Task 4; F-05 (mock-data layer + one worked example) → Task 5. The deferred Phase 0 notes are resolved: global `TooltipProvider` (Task 1/4), app-wide ⌘K handler (Task 3). Pagination windowing for high-row screens remains a Phase 2 concern (the seeded example is 6 rows).
- **Placeholders:** none — every step has exact paths, full code, and concrete commands. The 13 placeholder *pages* are real one-line components (intentional UI stubs, not plan placeholders).
- **Type consistency:** `Perusahaan`/`listPerusahaan`/`ListPerusahaanParams`/`usePerusahaanList` names are consistent across schema → data → query → page. `NAV`/`NAV_LOOKUP` used by sidebar, top bar, and palette. `DataTable` props are flagged to be confirmed against the real Phase 0 interface.
- **Out of scope (correctly absent):** real auth/login screen, RBAC, real persistence/mutations, the other modules' real screens — all Phase 2.
```
