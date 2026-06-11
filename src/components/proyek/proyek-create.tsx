"use client";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, FolderKanban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Checkbox } from "@/components/ui/checkbox";
import { SectionLabel } from "@/components/shared/detail-drawer";
import { formatRupiah } from "@/lib/format";
import { useCreateProyek } from "@/lib/query/proyek";
import { karyawanFixtures } from "@/lib/fixtures/karyawan";
import type { Sph } from "@/lib/schemas/penawaran";

const schema = z.object({
  nama: z.string().min(1, "Nama proyek wajib diisi."),
  area: z.string().min(1, "Area wajib diisi."),
  tahun: z.number().min(2020, "Tahun tidak valid."),
  assigneeIds: z.array(z.string()),
});
type FormValues = z.infer<typeof schema>;

const activeKaryawan = karyawanFixtures.filter((k) => k.status === "aktif");

export function ProyekCreate({ sph }: { sph: Sph }) {
  const router = useRouter();
  const createProyek = useCreateProyek();

  const defaultNama = `Proyek — ${sph.perusahaanNama}`;
  const layananNama = sph.items.map((i) => i.nama);
  const nilaiKontrak = sph.items.reduce((s, i) => s + i.harga * i.volume, 0);

  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nama: defaultNama,
      area: "",
      tahun: new Date().getFullYear(),
      assigneeIds: [],
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    const assignees = activeKaryawan
      .filter((k) => values.assigneeIds.includes(k.id))
      .map((k) => ({ karyawanId: k.id, nama: k.nama }));

    const proyek = await createProyek.mutateAsync({
      nama: values.nama,
      perusahaanId: sph.perusahaanId,
      perusahaanNama: sph.perusahaanNama,
      area: values.area,
      tahun: values.tahun,
      layananNama,
      nilaiKontrak,
      sphId: sph.id,
      assignees,
    });
    router.push(`/proyek/${proyek.id}`);
  });

  return (
    <div className="mx-auto max-w-xl space-y-6 px-4 py-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="size-8">
          <ArrowLeft className="size-4" />
        </Button>
        <div className="flex items-center gap-2">
          <FolderKanban className="size-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold tracking-tight">Buat Proyek</h1>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
        <SectionLabel>Dari SPH</SectionLabel>
        <p className="text-sm font-medium">{sph.perusahaanNama}</p>
        <p className="text-sm text-muted-foreground font-mono">{sph.id} · {formatRupiah(nilaiKontrak)}</p>
        <div className="flex flex-wrap gap-1 pt-1">
          {layananNama.map((n) => <Badge key={n} variant="info" className="text-xs">{n}</Badge>)}
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <Field data-invalid={!!errors.nama}>
          <FieldLabel htmlFor="p-nama">Nama Proyek</FieldLabel>
          <Input id="p-nama" aria-invalid={!!errors.nama} {...register("nama")} />
          <FieldError errors={errors.nama ? [errors.nama] : undefined} />
        </Field>

        <Field data-invalid={!!errors.area}>
          <FieldLabel htmlFor="p-area">Area / Kawasan</FieldLabel>
          <Input id="p-area" placeholder="mis. Kawasan Industri SIER, Surabaya" aria-invalid={!!errors.area} {...register("area")} />
          <FieldError errors={errors.area ? [errors.area] : undefined} />
        </Field>

        <Field data-invalid={!!errors.tahun}>
          <FieldLabel htmlFor="p-tahun">Tahun Pengerjaan</FieldLabel>
          <Input id="p-tahun" type="number" inputMode="numeric" aria-invalid={!!errors.tahun} {...register("tahun")} />
          <FieldError errors={errors.tahun ? [errors.tahun] : undefined} />
        </Field>

        <div className="space-y-2">
          <SectionLabel>Assignee (opsional)</SectionLabel>
          <Controller
            control={control}
            name="assigneeIds"
            render={({ field }) => (
              <div className="space-y-2">
                {activeKaryawan.map((k) => (
                  <label key={k.id} className="flex cursor-pointer items-center gap-2.5">
                    <Checkbox
                      checked={field.value.includes(k.id)}
                      onCheckedChange={(checked) => {
                        field.onChange(
                          checked
                            ? [...field.value, k.id]
                            : field.value.filter((id) => id !== k.id),
                        );
                      }}
                    />
                    <span className="text-sm">{k.nama}</span>
                    <span className="text-xs text-muted-foreground">{k.jabatan}</span>
                  </label>
                ))}
              </div>
            )}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>Batal</Button>
          <Button type="submit" loading={isSubmitting || createProyek.isPending}>
            Buat Proyek
          </Button>
        </div>
      </form>
    </div>
  );
}
