"use client";
import { Settings } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PengirimanTab } from "@/components/konfigurasi/pengiriman-tab";
import { KategoriArusKasTab } from "@/components/konfigurasi/kategori-arus-kas-tab";
import { DaftarPilihanTab } from "@/components/konfigurasi/daftar-pilihan-tab";
import { TarifPenomoranTab } from "@/components/konfigurasi/tarif-penomoran-tab";
import { TemplateTab } from "@/components/konfigurasi/template-tab";
import { WorkflowStatusTab } from "@/components/konfigurasi/workflow-status-tab";

export default function KonfigurasiPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Settings className="size-5 text-muted-foreground" />
        <h1 className="text-xl font-semibold tracking-tight">Konfigurasi Sistem</h1>
      </div>
      <Tabs defaultValue="daftar-pilihan">
        <TabsList variant="line">
          <TabsTrigger value="daftar-pilihan">Daftar Pilihan</TabsTrigger>
          <TabsTrigger value="workflow-status">Workflow Status</TabsTrigger>
          <TabsTrigger value="kategori-arus-kas">Kategori Arus Kas</TabsTrigger>
          <TabsTrigger value="tarif-penomoran">Tarif & Penomoran</TabsTrigger>
          <TabsTrigger value="template">Template</TabsTrigger>
          <TabsTrigger value="pengiriman">Pengiriman</TabsTrigger>
        </TabsList>
        <TabsContent value="daftar-pilihan"><DaftarPilihanTab /></TabsContent>
        <TabsContent value="workflow-status"><WorkflowStatusTab /></TabsContent>
        <TabsContent value="kategori-arus-kas"><KategoriArusKasTab /></TabsContent>
        <TabsContent value="tarif-penomoran"><TarifPenomoranTab /></TabsContent>
        <TabsContent value="template"><TemplateTab /></TabsContent>
        <TabsContent value="pengiriman"><PengirimanTab /></TabsContent>
      </Tabs>
    </div>
  );
}
