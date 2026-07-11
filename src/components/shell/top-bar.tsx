"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Eye, EyeOff, LogOut, Search, User } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { NAV_LOOKUP } from "@/lib/nav";
import { useSession, useLogout } from "@/lib/query/session";
import { useNotifications, useMarkNotificationRead } from "@/lib/query/notifications";
import { appRoleLabels } from "@/lib/schemas/pengguna";
import { initials } from "@/components/shared/detail-drawer";
import { relativeTime } from "@/lib/format";
import { usePrivacyMode } from "@/components/providers/privacy-mode-provider";
import type { Notification } from "@/lib/schemas/notifications";

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

/** Polled (30s), not pushed — no websocket/SSE layer exists in this app yet.
 * Only "mention" notifications are ever produced today (see
 * `src/lib/notifications/service.ts`); the type is generic since the DB
 * enum/table were designed to eventually carry more kinds. */
function NotificationBell() {
  const router = useRouter();
  const { data: notifications = [] } = useNotifications();
  const markRead = useMarkNotificationRead();
  const [open, setOpen] = React.useState(false);
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleClick = (n: Notification) => {
    setOpen(false);
    if (!n.isRead) markRead.mutate(n.id);
    if (n.linkPath) router.push(n.linkPath);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="relative" aria-label="Notifikasi">
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-destructive text-[9px] font-medium text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="border-b border-border px-3 py-2 text-sm font-medium">Notifikasi</div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">Belum ada notifikasi</p>
          )}
          {notifications.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => handleClick(n)}
              className="flex w-full flex-col items-start gap-0.5 border-b border-border/60 px-3 py-2.5 text-left last:border-0 hover:bg-muted/50 transition-colors"
            >
              <div className="flex w-full items-center gap-2">
                {!n.isRead && <span className="size-1.5 shrink-0 rounded-full bg-primary" />}
                <span className={cn("flex-1 truncate text-xs", n.isRead ? "text-muted-foreground" : "font-medium")}>{n.title}</span>
                <span className="shrink-0 text-[10px] text-muted-foreground">{relativeTime(n.createdAt)}</span>
              </div>
              {n.body && <p className="pl-3.5 text-xs text-muted-foreground line-clamp-2">{n.body}</p>}
            </button>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function TopBar() {
  const crumbs = useBreadcrumbs();
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const logout = useLogout();
  const { featureEnabled, revealed, toggleRevealed } = usePrivacyMode();
  // Privacy-mode reveal only applies on Dasbor — MaskedValue isn't used
  // anywhere else, so the toggle would be a no-op elsewhere.
  const isDasbor = pathname === "/dasbor";

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
        {featureEnabled && isDasbor && (
          <Button
            variant="outline"
            size="icon"
            aria-label={revealed ? "Sembunyikan data sensitif" : "Tampilkan data sensitif"}
            onClick={toggleRevealed}
          >
            {revealed ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
          </Button>
        )}
        {session?.role !== "viewer" && <NotificationBell />}
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
