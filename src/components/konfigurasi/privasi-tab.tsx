"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { usePrivacySettings, useUpdatePrivacySettings } from "@/lib/query/privacy-settings";

export function PrivasiTab() {
  const { data, isLoading } = usePrivacySettings();
  const { mutate, isPending } = useUpdatePrivacySettings();

  if (isLoading || !data) {
    return <p className="text-sm text-muted-foreground">Memuat…</p>;
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-sm">Mode Privasi</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <Field orientation="horizontal" className="items-start gap-2">
          <Checkbox
            checked={data.enabled}
            disabled={isPending}
            onCheckedChange={(checked) => mutate({ enabled: checked === true })}
            className="mt-0.5"
          />
          <div>
            <FieldLabel className="font-normal">Aktifkan mode privasi</FieldLabel>
            <FieldDescription>
              Angka sensitif (Dasbor, Penggajian, Faktur, Proyek) disembunyikan secara default
              dan hanya tampil setelah ikon mata di header diklik.
            </FieldDescription>
          </div>
        </Field>
      </CardContent>
    </Card>
  );
}
