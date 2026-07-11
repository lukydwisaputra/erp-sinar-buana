"use client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MilestoneSection } from "@/components/konfigurasi/milestone-template-section";
import { TerminSection } from "@/components/konfigurasi/termin-template-section";
import { PdfSection } from "@/components/konfigurasi/pdf-template-section";

export function TemplateTab() {
  return (
    <Tabs defaultValue="milestone">
      <TabsList variant="line">
        <TabsTrigger value="milestone">Milestone</TabsTrigger>
        <TabsTrigger value="termin">Termin</TabsTrigger>
        <TabsTrigger value="pdf">PDF</TabsTrigger>
      </TabsList>
      <TabsContent value="milestone"><MilestoneSection /></TabsContent>
      <TabsContent value="termin"><TerminSection /></TabsContent>
      <TabsContent value="pdf"><PdfSection /></TabsContent>
    </Tabs>
  );
}
