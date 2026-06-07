import { ThemeToggle } from "@/components/design-system/theme-toggle";
import { ShowcaseNav } from "@/components/design-system/showcase-nav";
import { FormSection } from "./sections/form";
import { DataSection } from "./sections/data";
import { OverlaySection } from "./sections/overlays";
import { FeedbackSection } from "./sections/feedback";
import { DisclosureSection } from "./sections/disclosure";

export default function DesignSystemPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="lg:grid lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-10">
        <aside className="hidden lg:block">
          <ShowcaseNav />
        </aside>
        <main>
          <div className="mb-10 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Sinar Buana — Design System
              </h1>
              <p className="text-sm text-muted-foreground">
                Pustaka komponen prototipe (shadcn/ui)
              </p>
            </div>
            <ThemeToggle />
          </div>
          <FormSection />
          <DataSection />
          <OverlaySection />
          <FeedbackSection />
          <DisclosureSection />
        </main>
      </div>
    </div>
  );
}
