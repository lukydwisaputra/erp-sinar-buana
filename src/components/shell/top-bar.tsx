"use client";
import { usePathname } from "next/navigation";
import { LogOut, Search, User } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage,
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
        <Button variant="outline" size="sm" className="w-56 justify-start gap-2 text-muted-foreground"
          onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}>
          <Search className="size-4" /> Cari <Kbd className="ml-auto">⌘K</Kbd>
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
