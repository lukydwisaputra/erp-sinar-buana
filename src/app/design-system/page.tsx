import { ThemeToggle } from "@/components/design-system/theme-toggle";
import { FormSection } from "./sections/form";
import { DataSection } from "./sections/data";
import { OverlaySection } from "./sections/overlays";

export default function DesignSystemPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-10 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sinar Buana — Design System</h1>
          <p className="text-sm text-muted-foreground">Pustaka komponen prototipe (shadcn/ui)</p>
        </div>
        <ThemeToggle />
      </div>
      <FormSection />
      <DataSection />
      <OverlaySection />
    </div>
  );
}
