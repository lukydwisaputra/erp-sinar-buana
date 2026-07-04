"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Search, User } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
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
import { useSession, useLogout } from "@/lib/query/session";
import { appRoleLabels } from "@/lib/schemas/pengguna";
import { initials } from "@/components/shared/detail-drawer";

type Crumb = { label: string; href: string };

function titleCase(seg: string) {
  return seg
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Builds a breadcrumb trail from the current pathname. */
function useBreadcrumbs(): Crumb[] {
  const pathname = usePathname();
  return React.useMemo(() => {
    const segs = pathname.split("/").filter(Boolean);
    if (segs.length === 0 || segs[0] === "dasbor") {
      return [{ label: "Beranda", href: "/dasbor" }];
    }
    const crumbs: Crumb[] = [{ label: "Beranda", href: "/dasbor" }];
    let acc = "";
    segs.forEach((seg, i) => {
      acc += "/" + seg;
      let label: string;
      if (i === 0) label = NAV_LOOKUP[acc] ?? titleCase(seg);
      else if (seg === "baru") label = "Baru";
      else label = decodeURIComponent(seg);
      crumbs.push({ label, href: acc });
    });
    return crumbs;
  }, [pathname]);
}

export function TopBar() {
  const crumbs = useBreadcrumbs();
  const router = useRouter();
  const { data: session } = useSession();
  const logout = useLogout();

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => router.push("/login"),
    });
  };

  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/95 px-4 backdrop-blur">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-1 h-5" />
      <Breadcrumb>
        <BreadcrumbList>
          {crumbs.map((c, i) => {
            const isLast = i === crumbs.length - 1;
            return (
              <React.Fragment key={c.href}>
                <BreadcrumbItem className="max-w-[40ch] truncate">
                  {isLast ? (
                    <BreadcrumbPage className="truncate">{c.label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      <Link href={c.href} className="truncate">{c.label}</Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
                {!isLast && <BreadcrumbSeparator />}
              </React.Fragment>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>

      <div className="ml-auto flex items-center gap-1.5">
        <Button variant="outline" size="sm" className="w-56 justify-start gap-2 text-muted-foreground"
          onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}>
          <Search className="size-4" /> Cari <Kbd className="ml-auto">⌘K</Kbd>
        </Button>
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full" aria-label="Menu pengguna">
              <Avatar className="size-8">
                <AvatarFallback>{session ? initials(session.fullName) : "?"}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>
              <div className="grid">
                <span className="text-sm font-medium">{session?.fullName ?? "..."}</span>
                <span className="text-xs text-muted-foreground">
                  {session ? appRoleLabels[session.role] : ""}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem><User className="mr-2 size-4" /> Profil</DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={handleLogout}>
              <LogOut className="mr-2 size-4" /> Keluar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
