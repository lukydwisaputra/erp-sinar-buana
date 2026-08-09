import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Providers } from "@/app/providers";
import { AppSidebar } from "@/components/shell/app-sidebar";
import { TopBar } from "@/components/shell/top-bar";
import { CommandPalette } from "@/components/shell/command-palette";
import { RouteGuard } from "@/components/shell/route-guard";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="h-svh min-w-0 overflow-y-auto overflow-x-hidden">
          <TopBar />
          <main className="flex-1 p-4 md:p-6"><RouteGuard>{children}</RouteGuard></main>
        </SidebarInset>
        <CommandPalette />
      </SidebarProvider>
    </Providers>
  );
}
