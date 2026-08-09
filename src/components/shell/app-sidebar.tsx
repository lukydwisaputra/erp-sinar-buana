"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Leaf } from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupLabel, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarRail,
} from "@/components/ui/sidebar";
import { navForRole } from "@/lib/nav";
import { useSession } from "@/lib/query/session";
import { useCompanyProfile } from "@/lib/query/company-profile";
import { companyProfileCache } from "@/lib/company-profile/cache";
import { usePdfTemplateList } from "@/lib/query/pdf-templates";
import { pdfTemplateNotesCache, pickActiveNotes } from "@/lib/pdf-templates/cache";

export function AppSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { data: profile } = useCompanyProfile();
  // Printed documents (letterhead/footer/faktur/slip/SPH cover) read this
  // singleton synchronously, with no loading state of their own — see
  // `src/lib/company-profile/cache.ts`. The sidebar is part of the persistent
  // app shell, mounted before any document can be opened, so this keeps the
  // cache fresh with zero props threaded through the document tree.
  React.useEffect(() => {
    if (profile) companyProfileCache.current = profile;
  }, [profile]);
  const { data: pdfTemplates } = usePdfTemplateList();
  React.useEffect(() => {
    if (pdfTemplates) pdfTemplateNotesCache.current = pickActiveNotes(pdfTemplates);
  }, [pdfTemplates]);
  const nav = navForRole(session?.role);
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-1 py-1.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <div
            className={`flex aspect-square size-8 items-center justify-center overflow-hidden rounded-md ${
              profile?.logo ? "" : "bg-primary text-primary-foreground"
            }`}
          >
            {profile?.logo ? (
              <img src={profile.logo} alt="Logo perusahaan" className="size-full object-contain" />
            ) : (
              <Leaf className="size-4" />
            )}
          </div>
          <div className="grid flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
            <span className="truncate text-sm font-semibold">Sinar Buana</span>
            <span className="truncate text-xs text-muted-foreground">ERP Internal</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {nav.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarMenu className="group-data-[collapsible=icon]:items-center">
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
