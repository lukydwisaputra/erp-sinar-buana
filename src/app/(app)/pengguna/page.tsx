"use client";
import * as React from "react";
import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Copy, MoreHorizontal, Pencil, Plus, RotateCcw, UserCog, UserX } from "lucide-react";
import { DataTable } from "@/components/shared/data-table";
import { ErrorState } from "@/components/shared/error-state";
import { FormSheet } from "@/components/shared/form-sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { StatusBadge, type StatusBadgeConfig } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldError, FieldDescription } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { onFormInvalid } from "@/lib/form-toast";
import {
  usePenggunaList, useCreatePengguna, useUpdatePengguna, useSetPenggunaActive,
  useResendInvite, useAdminResetPassword, type PenggunaAccount,
} from "@/lib/query/pengguna";
import { useKaryawanList } from "@/lib/query/karyawan";
import { usePerusahaanList } from "@/lib/query/perusahaan";
import { appRoleValues, appRoleLabels, akunStatusLabels, type AkunStatus } from "@/lib/schemas/pengguna";

/** Radix Select can't carry an empty-string value, so "Tidak Ditautkan" uses
 * this sentinel and gets mapped back to `null` at the form boundary. */
const NO_EMPLOYEE = "__none__";
const NO_CLIENT_COMPANY = "__none__";

function KaryawanLinkField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { data: karyawan = [] } = useKaryawanList();
  const aktif = karyawan.filter((k) => k.status === "aktif");
  const isEmpty = aktif.length === 0;
  return (
    <Field>
      <FieldLabel htmlFor="p-karyawan">Tautan Karyawan</FieldLabel>
      <Select value={value} onValueChange={onChange} disabled={isEmpty}>
        <SelectTrigger id="p-karyawan" className="w-full">
          <SelectValue placeholder="Pilih karyawan…" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NO_EMPLOYEE}>Tidak Ditautkan</SelectItem>
          {aktif.map((k) => <SelectItem key={k.id} value={k.id}>{k.nama}</SelectItem>)}
        </SelectContent>
      </Select>
      <FieldDescription>
        {isEmpty
          ? "Belum ada data karyawan aktif — tambahkan lewat menu Karyawan agar bisa ditautkan di sini."
          : "Diperlukan untuk akses “slip gaji sendiri” dan assignment proyek."}
      </FieldDescription>
    </Field>
  );
}

/** Only meaningful for role="viewer" — an external client-contact (PIC)
 * account. Scopes them to see only that one company's own Proyek/SPH/Faktur;
 * unlinked viewer accounts see nothing (a dead end, not an error). */
function ClientCompanyLinkField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { data: perusahaan = [] } = usePerusahaanList();
  const isEmpty = perusahaan.length === 0;
  return (
    <Field>
      <FieldLabel htmlFor="p-client-company">Tautan Perusahaan Klien</FieldLabel>
      <Select value={value} onValueChange={onChange} disabled={isEmpty}>
        <SelectTrigger id="p-client-company" className="w-full">
          <SelectValue placeholder="Pilih perusahaan…" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NO_CLIENT_COMPANY}>Tidak Ditautkan</SelectItem>
          {perusahaan.map((p) => <SelectItem key={p.id} value={p.id}>{p.nama}</SelectItem>)}
        </SelectContent>
      </Select>
      <FieldDescription>
        {isEmpty
          ? "Belum ada data perusahaan — tambahkan lewat menu Perusahaan agar bisa ditautkan di sini."
          : "Akun ini hanya akan melihat Proyek, SPH, dan Faktur milik perusahaan yang ditautkan — tidak ada modul lain."}
      </FieldDescription>
    </Field>
  );
}

const STATUS_BADGE: Record<AkunStatus, StatusBadgeConfig> = {
  aktif: { label: akunStatusLabels.aktif, variant: "success" },
  menunggu_aktivasi: { label: akunStatusLabels.menunggu_aktivasi, variant: "warning" },
  nonaktif: { label: akunStatusLabels.nonaktif, variant: "secondary" },
};

/* ---------- invite/reset link dialog ---------- */

function LinkDialog({
  title,
  link,
  onOpenChange,
}: {
  title: string;
  link: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  const url = link ? `${window.location.origin}${link}` : "";
  return (
    <Dialog open={!!link} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Belum ada layanan email terpasang — salin tautan ini dan kirimkan langsung ke pengguna.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2">
          <Input readOnly value={url} className="font-mono text-xs" />
          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={() => {
              navigator.clipboard.writeText(url);
              toast.success("Tautan disalin.");
            }}
          >
            <Copy className="size-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- columns ---------- */

function makeColumns(
  onEdit: (a: PenggunaAccount) => void,
  onToggleActive: (a: PenggunaAccount) => void,
  onResendInvite: (a: PenggunaAccount) => void,
  onResetPassword: (a: PenggunaAccount) => void,
): ColumnDef<PenggunaAccount>[] {
  return [
    { accessorKey: "fullName", header: "Nama", meta: { className: "min-w-48 font-medium" } },
    { accessorKey: "email", header: "Email", meta: { mono: true } },
    {
      accessorKey: "role", header: "Peran",
      cell: ({ row }) => appRoleLabels[row.original.role],
    },
    {
      accessorKey: "status", header: "Status", meta: { className: "text-center" },
      cell: ({ row }) => <StatusBadge status={row.original.status} map={STATUS_BADGE} />,
    },
    {
      id: "actions", header: "", meta: { className: "w-10" },
      cell: ({ row }) => {
        const a = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger className="outline-none">
              <MoreHorizontal className="size-4 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => onEdit(a)}>
                <Pencil className="size-3.5" /> Ubah
              </DropdownMenuItem>
              {a.status === "menunggu_aktivasi" && (
                <DropdownMenuItem onSelect={() => onResendInvite(a)}>
                  <RotateCcw className="size-3.5" /> Kirim Ulang Undangan
                </DropdownMenuItem>
              )}
              {a.status === "aktif" && (
                <DropdownMenuItem onSelect={() => onResetPassword(a)}>
                  <RotateCcw className="size-3.5" /> Reset Sandi
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => onToggleActive(a)}>
                <UserX className="size-3.5" /> {a.isActive ? "Nonaktifkan" : "Aktifkan"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}

/* ---------- create form ---------- */

const createFormSchema = z.object({
  fullName: z.string().min(1, "Nama wajib diisi."),
  email: z.string().min(1, "Email wajib diisi.").email("Format email tidak valid."),
  role: z.enum(appRoleValues, { message: "Peran wajib dipilih." }),
  employeeId: z.string(),
  clientCompanyId: z.string(),
});
type CreateForm = z.infer<typeof createFormSchema>;

function PenggunaCreateForm({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (inviteLink: string) => void;
}) {
  const { mutateAsync, isPending } = useCreatePengguna();
  const { register, handleSubmit, control, watch, reset, formState: { errors } } = useForm<CreateForm>({
    resolver: zodResolver(createFormSchema),
    defaultValues: { fullName: "", email: "", role: "viewer", employeeId: NO_EMPLOYEE, clientCompanyId: NO_CLIENT_COMPANY },
  });
  const role = watch("role");

  const onSubmit = handleSubmit(async (values) => {
    const account = await mutateAsync({
      fullName: values.fullName, email: values.email, role: values.role,
      employeeId: values.employeeId === NO_EMPLOYEE ? null : values.employeeId,
      clientCompanyId: values.clientCompanyId === NO_CLIENT_COMPANY ? null : values.clientCompanyId,
    });
    onOpenChange(false);
    reset();
    onCreated(`/accept-invite?token=${account.inviteToken}`);
  }, onFormInvalid);

  return (
    <FormSheet
      open={open}
      onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}
      title="Tambah Akun Pengguna"
      description="Akun akan berstatus Menunggu Aktivasi hingga pengguna mengatur sandinya sendiri."
      onSubmit={onSubmit}
      submitLabel={isPending ? "Menyimpan…" : "Simpan"}
    >
      <Field data-invalid={!!errors.fullName}>
        <FieldLabel htmlFor="p-nama">Nama</FieldLabel>
        <Input id="p-nama" placeholder="Budi Santoso" aria-invalid={!!errors.fullName} {...register("fullName")} />
        <FieldError errors={errors.fullName ? [errors.fullName] : undefined} />
      </Field>

      <Field data-invalid={!!errors.email}>
        <FieldLabel htmlFor="p-email">Email (login)</FieldLabel>
        <Input id="p-email" type="email" placeholder="budi@sbmj.co.id" aria-invalid={!!errors.email} {...register("email")} />
        <FieldError errors={errors.email ? [errors.email] : undefined} />
      </Field>

      <Field data-invalid={!!errors.role}>
        <FieldLabel htmlFor="p-role">Peran</FieldLabel>
        <Controller
          control={control}
          name="role"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="p-role" className="w-full" aria-invalid={!!errors.role}>
                <SelectValue placeholder="Pilih peran" />
              </SelectTrigger>
              <SelectContent>
                {appRoleValues.map((r) => <SelectItem key={r} value={r}>{appRoleLabels[r]}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        />
        <FieldError errors={errors.role ? [errors.role] : undefined} />
      </Field>

      {role === "viewer" ? (
        <Controller
          control={control}
          name="clientCompanyId"
          render={({ field }) => <ClientCompanyLinkField value={field.value} onChange={field.onChange} />}
        />
      ) : (
        <Controller
          control={control}
          name="employeeId"
          render={({ field }) => <KaryawanLinkField value={field.value} onChange={field.onChange} />}
        />
      )}
    </FormSheet>
  );
}

/* ---------- edit form ---------- */

const editFormSchema = z.object({
  role: z.enum(appRoleValues, { message: "Peran wajib dipilih." }),
  employeeId: z.string(),
  clientCompanyId: z.string(),
});
type EditForm = z.infer<typeof editFormSchema>;

function PenggunaEditForm({
  account,
  open,
  onOpenChange,
}: {
  account: PenggunaAccount;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { mutateAsync, isPending } = useUpdatePengguna();
  const defaults = React.useCallback((a: PenggunaAccount): EditForm => ({
    role: a.role, employeeId: a.employeeId ?? NO_EMPLOYEE, clientCompanyId: a.clientCompanyId ?? NO_CLIENT_COMPANY,
  }), []);
  const { handleSubmit, control, watch, reset, formState: { errors } } = useForm<EditForm>({
    resolver: zodResolver(editFormSchema),
    defaultValues: defaults(account),
  });
  const role = watch("role");

  React.useEffect(() => {
    if (open) reset(defaults(account));
  }, [open, account, reset, defaults]);

  const onSubmit = handleSubmit(async (values) => {
    await mutateAsync({
      id: account.id,
      input: {
        role: values.role,
        employeeId: values.employeeId === NO_EMPLOYEE ? null : values.employeeId,
        clientCompanyId: values.clientCompanyId === NO_CLIENT_COMPANY ? null : values.clientCompanyId,
      },
    });
    onOpenChange(false);
  }, onFormInvalid);

  return (
    <FormSheet
      open={open}
      onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}
      title="Ubah Akun Pengguna"
      description={account.fullName}
      onSubmit={onSubmit}
      submitLabel={isPending ? "Menyimpan…" : "Simpan Perubahan"}
    >
      <Field data-invalid={!!errors.role}>
        <FieldLabel htmlFor="p-edit-role">Peran</FieldLabel>
        <Controller
          control={control}
          name="role"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="p-edit-role" className="w-full" aria-invalid={!!errors.role}>
                <SelectValue placeholder="Pilih peran" />
              </SelectTrigger>
              <SelectContent>
                {appRoleValues.map((r) => <SelectItem key={r} value={r}>{appRoleLabels[r]}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        />
        <FieldError errors={errors.role ? [errors.role] : undefined} />
      </Field>

      {role === "viewer" ? (
        <Controller
          control={control}
          name="clientCompanyId"
          render={({ field }) => <ClientCompanyLinkField value={field.value} onChange={field.onChange} />}
        />
      ) : (
        <Controller
          control={control}
          name="employeeId"
          render={({ field }) => <KaryawanLinkField value={field.value} onChange={field.onChange} />}
        />
      )}
    </FormSheet>
  );
}

/* ---------- page ---------- */

export default function PenggunaPage() {
  const { data, isLoading, isError, refetch } = usePenggunaList();
  const { mutate: setActive, isPending: isTogglingActive } = useSetPenggunaActive();
  const resendInvite = useResendInvite();
  const adminResetPassword = useAdminResetPassword();

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<PenggunaAccount | null>(null);
  const [toggleTarget, setToggleTarget] = useState<PenggunaAccount | null>(null);
  const [linkDialog, setLinkDialog] = useState<{ title: string; link: string } | null>(null);

  const columns = makeColumns(
    setEditTarget,
    setToggleTarget,
    (a) => resendInvite.mutate(a.id, {
      onSuccess: ({ inviteToken }) =>
        setLinkDialog({ title: "Tautan Undangan", link: `/accept-invite?token=${inviteToken}` }),
    }),
    (a) => adminResetPassword.mutate(a.id, {
      onSuccess: ({ resetToken }) =>
        setLinkDialog({ title: "Tautan Atur Ulang Sandi", link: `/reset-password?token=${resetToken}` }),
    }),
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <UserCog className="size-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold tracking-tight">Pengguna</h1>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" /> Tambah Akun
        </Button>
      </div>

      <PenggunaCreateForm
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(link) => setLinkDialog({ title: "Tautan Undangan", link })}
      />

      {editTarget && (
        <PenggunaEditForm
          account={editTarget}
          open={!!editTarget}
          onOpenChange={(o) => { if (!o) setEditTarget(null); }}
        />
      )}

      <AlertDialog open={!!toggleTarget} onOpenChange={(o) => { if (!o) setToggleTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {toggleTarget?.isActive ? "Nonaktifkan Akun?" : "Aktifkan Akun?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {toggleTarget?.isActive ? (
                <>
                  <strong>{toggleTarget?.fullName}</strong> tidak akan bisa masuk lagi dan seluruh
                  sesi aktifnya akan diakhiri. Data & jejak audit tetap tersimpan.
                </>
              ) : (
                <><strong>{toggleTarget?.fullName}</strong> akan dapat masuk kembali.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className={toggleTarget?.isActive ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : undefined}
              disabled={isTogglingActive}
              onClick={() => {
                if (!toggleTarget) return;
                setActive(
                  { id: toggleTarget.id, isActive: !toggleTarget.isActive },
                  { onSuccess: () => setToggleTarget(null) },
                );
              }}
            >
              {toggleTarget?.isActive ? "Nonaktifkan" : "Aktifkan"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <LinkDialog
        title={linkDialog?.title ?? ""}
        link={linkDialog?.link ?? null}
        onOpenChange={(o) => { if (!o) setLinkDialog(null); }}
      />

      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <DataTable
          columns={columns}
          data={data ?? []}
          loading={isLoading}
          searchColumns={["fullName", "email"]}
          searchPlaceholder="Cari nama atau email…"
          emptyMessage="Belum ada akun pengguna"
          rowActions={false}
        />
      )}
    </div>
  );
}
