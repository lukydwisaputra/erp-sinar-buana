"use client";
import * as React from "react";
import {
  Settings, ListChecks, Workflow, ArrowRightLeft, Percent, LayoutTemplate, Send, Shield, ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { PengirimanTab } from "@/components/konfigurasi/pengiriman-tab";
import { KategoriArusKasTab } from "@/components/konfigurasi/kategori-arus-kas-tab";
import { KategoriList, KATEGORI_META } from "@/components/konfigurasi/daftar-pilihan-tab";
import { TarifPenomoranTab } from "@/components/konfigurasi/tarif-penomoran-tab";
import { WorkflowStatusTab } from "@/components/konfigurasi/workflow-status-tab";
import { PrivasiTab } from "@/components/konfigurasi/privasi-tab";
import { MilestoneSection } from "@/components/konfigurasi/milestone-template-section";
import { TerminSection } from "@/components/konfigurasi/termin-template-section";
import { RabTemplateSection } from "@/components/konfigurasi/rab-template-section";
import { JadwalTemplateSection } from "@/components/konfigurasi/jadwal-template-section";
import { PdfSection } from "@/components/konfigurasi/pdf-template-section";
import { SignatureTemplateSection } from "@/components/konfigurasi/signature-template-section";
import { daftarPilihanKategori } from "@/lib/schemas/daftar-pilihan";

type NavLeaf = { key: string; label: string; content: React.ReactNode };
type NavNode = { key: string; label: string; icon: LucideIcon; content?: React.ReactNode; children?: NavLeaf[] };

const NAV: NavNode[] = [
  {
    key: "daftar-pilihan",
    label: "Daftar Pilihan",
    icon: ListChecks,
    children: daftarPilihanKategori.options.map((k) => ({
      key: k, label: KATEGORI_META[k].label, content: <KategoriList kategori={k} />,
    })),
  },
  { key: "workflow-status", label: "Workflow Status", icon: Workflow, content: <WorkflowStatusTab /> },
  { key: "kategori-arus-kas", label: "Kategori Arus Kas", icon: ArrowRightLeft, content: <KategoriArusKasTab /> },
  { key: "tarif-penomoran", label: "Tarif & Penomoran", icon: Percent, content: <TarifPenomoranTab /> },
  {
    key: "template",
    label: "Template",
    icon: LayoutTemplate,
    children: [
      { key: "milestone", label: "Milestone", content: <MilestoneSection /> },
      { key: "termin", label: "Termin", content: <TerminSection /> },
      { key: "rab", label: "RAB", content: <RabTemplateSection /> },
      { key: "jadwal", label: "Jadwal", content: <JadwalTemplateSection /> },
      { key: "pdf", label: "PDF", content: <PdfSection /> },
      { key: "ttd", label: "Tanda Tangan", content: <SignatureTemplateSection /> },
    ],
  },
  { key: "pengiriman", label: "Pengiriman", icon: Send, content: <PengirimanTab /> },
  { key: "privasi", label: "Privasi", icon: Shield, content: <PrivasiTab /> },
];

// Flat lookup of every selectable (leaf) node — top-level nodes without
// children are leaves themselves; nodes with children only select via a child.
const LEAVES = NAV.flatMap((node) => node.children ?? [{ key: node.key, label: node.label, content: node.content! }]);

function groupKeyForLeaf(leafKey: string): string | undefined {
  return NAV.find((n) => n.children?.some((c) => c.key === leafKey))?.key;
}

function NavButton({ label, icon: Icon, active, indent, onClick }: {
  label: string; icon?: LucideIcon; active: boolean; indent?: boolean; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors",
        indent && "pl-9 text-[13px]",
        active ? "bg-accent font-medium text-accent-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
      )}
    >
      {Icon && <Icon className="size-4 shrink-0" />}
      <span className="truncate">{label}</span>
    </button>
  );
}

export default function KonfigurasiPage() {
  const [activeKey, setActiveKey] = React.useState(LEAVES[0].key);
  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>(() => {
    const g = groupKeyForLeaf(LEAVES[0].key);
    return g ? { [g]: true } : {};
  });
  const active = LEAVES.find((l) => l.key === activeKey) ?? LEAVES[0];

  function selectLeaf(key: string) {
    setActiveKey(key);
    const g = groupKeyForLeaf(key);
    if (g) setOpenGroups((prev) => ({ ...prev, [g]: true }));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Settings className="size-5 text-muted-foreground" />
        <h1 className="text-xl font-semibold tracking-tight">Konfigurasi Sistem</h1>
      </div>

      <div className="flex">
        <nav className="w-56 shrink-0 space-y-0.5 border-r border-border pr-4">
          {NAV.map((node) =>
            node.children ? (
              <Collapsible
                key={node.key}
                open={!!openGroups[node.key]}
                onOpenChange={(open) => setOpenGroups((prev) => ({ ...prev, [node.key]: open }))}
              >
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-accent/50"
                  >
                    <node.icon className="size-4 shrink-0 text-muted-foreground" />
                    <span className="flex-1 truncate">{node.label}</span>
                    <ChevronRight className={cn("size-4 shrink-0 text-muted-foreground transition-transform", openGroups[node.key] && "rotate-90")} />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-0.5 py-0.5">
                  {node.children.map((child) => (
                    <NavButton
                      key={child.key}
                      label={child.label}
                      indent
                      active={activeKey === child.key}
                      onClick={() => selectLeaf(child.key)}
                    />
                  ))}
                </CollapsibleContent>
              </Collapsible>
            ) : (
              <NavButton
                key={node.key}
                label={node.label}
                icon={node.icon}
                active={activeKey === node.key}
                onClick={() => selectLeaf(node.key)}
              />
            ),
          )}
        </nav>

        <div className="min-w-0 flex-1 pl-6">{active.content}</div>
      </div>
    </div>
  );
}
