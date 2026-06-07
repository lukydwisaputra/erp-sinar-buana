"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import {
  SearchIcon,
  Loader2Icon,
  CalendarIcon,
  AlignLeftIcon,
  AlignCenterIcon,
  AlignRightIcon,
} from "lucide-react";

import { ShowcaseSection } from "@/components/design-system/showcase-section";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxChips,
  ComboboxChip,
  ComboboxChipsInput,
  ComboboxValue,
  useComboboxAnchor,
} from "@/components/ui/combobox";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { cn } from "@/lib/utils";
import { MoneyInput } from "@/components/shared/money-input";
import { FileDropzone } from "@/components/shared/file-dropzone";

const COMPANIES = [
  "PT Sinar Buana Sejahtera",
  "PT Maju Bersama Abadi",
  "PT Cahaya Nusantara",
  "CV Karya Mandiri",
  "CV Berkah Jaya",
  "PT Sentosa Logistik",
  "PT Mitra Sukses Perkasa",
];

/* ---------- DS-02 Button + button-group ---------- */
function ButtonShowcase() {
  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button>Simpan</Button>
        <Button variant="secondary">Sekunder</Button>
        <Button variant="outline">Garis</Button>
        <Button variant="ghost">Samar</Button>
        <Button variant="destructive">Hapus</Button>
        <Button variant="link">Tautan</Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm">Kecil</Button>
        <Button size="default">Standar</Button>
        <Button size="lg">Besar</Button>
        <Button size="icon" aria-label="Cari">
          <SearchIcon />
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button disabled>Nonaktif</Button>
        <Button disabled aria-busy="true">
          <Loader2Icon className="animate-spin" />
          Memuat…
        </Button>
      </div>

      <ButtonGroup>
        <Button variant="outline" aria-label="Rata kiri">
          <AlignLeftIcon />
        </Button>
        <Button variant="outline" aria-label="Rata tengah">
          <AlignCenterIcon />
        </Button>
        <Button variant="outline" aria-label="Rata kanan">
          <AlignRightIcon />
        </Button>
      </ButtonGroup>
    </div>
  );
}

/* ---------- DS-03 Input + input-group ---------- */
function InputShowcase() {
  return (
    <div className="flex w-full flex-wrap items-start gap-6">
      <div className="grid w-64 gap-1.5">
        <Label htmlFor="ds-nama-pelanggan">Nama pelanggan</Label>
        <Input id="ds-nama-pelanggan" placeholder="cth. Budi Santoso" />
      </div>

      <div className="grid w-64 gap-1.5">
        <Label htmlFor="ds-cari">Cari</Label>
        <InputGroup>
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput id="ds-cari" placeholder="Cari invoice…" />
        </InputGroup>
      </div>

      <div className="grid w-64 gap-1.5">
        <Label htmlFor="ds-harga">Harga satuan</Label>
        <InputGroup>
          <InputGroupAddon>
            <InputGroupText>Rp</InputGroupText>
          </InputGroupAddon>
          <InputGroupInput
            id="ds-harga"
            inputMode="numeric"
            placeholder="0"
            className="text-right font-mono tabular-nums"
          />
        </InputGroup>
      </div>

      <div className="grid w-64 gap-1.5">
        <Label htmlFor="ds-kode">Kode referensi</Label>
        <InputGroup>
          <InputGroupInput id="ds-kode" placeholder="REF-001" />
          <InputGroupAddon align="inline-end">
            <InputGroupButton variant="default">Terapkan</InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </div>

      <div className="grid w-64 gap-1.5">
        <Label htmlFor="ds-fokus">Fokus (autofocus on tab)</Label>
        <Input id="ds-fokus" defaultValue="Status fokus" />
      </div>

      <div className="grid w-64 gap-1.5">
        <Label htmlFor="ds-error">Email (error)</Label>
        <Input
          id="ds-error"
          aria-invalid
          defaultValue="bukan-email"
          aria-describedby="ds-error-msg"
        />
        <p id="ds-error-msg" className="text-xs text-destructive">
          Format email tidak valid.
        </p>
      </div>
    </div>
  );
}

/* ---------- DS-04 Textarea + Label ---------- */
function TextareaShowcase() {
  return (
    <div className="grid w-80 gap-1.5">
      <Label htmlFor="ds-catatan">Catatan</Label>
      <Textarea
        id="ds-catatan"
        rows={3}
        placeholder="Tulis catatan pengiriman…"
        aria-describedby="ds-catatan-help"
      />
      <p id="ds-catatan-help" className="text-xs text-muted-foreground">
        Maksimal 280 karakter. Catatan tampil pada surat jalan.
      </p>
    </div>
  );
}

/* ---------- DS-05 Field + Form (RHF + Zod) ---------- */
const demoSchema = z.object({
  nama: z.string().min(1, "Nama wajib diisi."),
  email: z.string().min(1, "Email wajib diisi.").email("Format email tidak valid."),
});
type DemoValues = z.infer<typeof demoSchema>;

function FormShowcase() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DemoValues>({
    resolver: zodResolver(demoSchema),
    mode: "onBlur",
    defaultValues: { nama: "", email: "" },
  });
  const [submitted, setSubmitted] = React.useState<DemoValues | null>(null);

  return (
    <form
      onSubmit={handleSubmit((values) => setSubmitted(values))}
      noValidate
      className="flex w-80 flex-col gap-5"
    >
      <Field data-invalid={!!errors.nama}>
        <FieldLabel htmlFor="ds-form-nama">Nama</FieldLabel>
        <Input
          id="ds-form-nama"
          aria-invalid={!!errors.nama}
          placeholder="cth. Siti Aminah"
          {...register("nama")}
        />
        <FieldError errors={errors.nama ? [errors.nama] : undefined} />
      </Field>

      <Field data-invalid={!!errors.email}>
        <FieldLabel htmlFor="ds-form-email">Email</FieldLabel>
        <Input
          id="ds-form-email"
          type="email"
          aria-invalid={!!errors.email}
          placeholder="nama@perusahaan.co.id"
          {...register("email")}
        />
        <FieldError errors={errors.email ? [errors.email] : undefined} />
        <FieldDescription>Digunakan untuk mengirim invoice.</FieldDescription>
      </Field>

      <Button type="submit" className="w-fit">
        Kirim
      </Button>

      {submitted && (
        <p className="text-xs text-success">
          Terkirim: {submitted.nama} — {submitted.email}
        </p>
      )}
    </form>
  );
}

/* ---------- DS-06 Select + native-select ---------- */
function SelectShowcase() {
  return (
    <div className="flex w-full flex-wrap items-start gap-6">
      <div className="grid w-56 gap-1.5">
        <Label>Status penawaran</Label>
        <Select>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Pilih status…" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="draf">Draf</SelectItem>
            <SelectItem value="terkirim">Terkirim</SelectItem>
            <SelectItem value="deal">Deal</SelectItem>
            <SelectItem value="batal">Batal</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid w-56 gap-1.5">
        <Label htmlFor="ds-native-status">Status (native)</Label>
        <NativeSelect id="ds-native-status" defaultValue="" className="w-full">
          <option value="" disabled>
            Pilih status…
          </option>
          <option value="draf">Draf</option>
          <option value="terkirim">Terkirim</option>
          <option value="deal">Deal</option>
          <option value="batal">Batal</option>
        </NativeSelect>
      </div>
    </div>
  );
}

/* ---------- DS-07 Combobox (single + multi) ---------- */
function ComboboxShowcase() {
  return (
    <div className="flex w-full flex-wrap items-start gap-6">
      <div className="grid w-72 gap-1.5">
        <Label>Perusahaan (pilih satu)</Label>
        <Combobox items={COMPANIES}>
          <ComboboxInput placeholder="Cari perusahaan…" />
          <ComboboxContent>
            <ComboboxEmpty>Tidak ada hasil.</ComboboxEmpty>
            <ComboboxList>
              {(item: string) => (
                <ComboboxItem key={item} value={item}>
                  {item}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      </div>

      <div className="grid w-72 gap-1.5">
        <Label>Perusahaan (pilih banyak)</Label>
        <MultiCombobox />
      </div>
    </div>
  );
}

function MultiCombobox() {
  const anchor = useComboboxAnchor();
  const [value, setValue] = React.useState<string[]>([
    "PT Sinar Buana Sejahtera",
  ]);

  return (
    <Combobox
      items={COMPANIES}
      multiple
      value={value}
      onValueChange={setValue}
    >
      <ComboboxChips ref={anchor}>
        <ComboboxValue>
          {(selected: string[]) => (
            <>
              {selected.map((item) => (
                <ComboboxChip key={item} aria-label={item}>
                  {item}
                </ComboboxChip>
              ))}
              <ComboboxChipsInput placeholder="Tambah…" />
            </>
          )}
        </ComboboxValue>
      </ComboboxChips>
      <ComboboxContent anchor={anchor}>
        <ComboboxEmpty>Tidak ada hasil.</ComboboxEmpty>
        <ComboboxList>
          {(item: string) => (
            <ComboboxItem key={item} value={item}>
              {item}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

/* ---------- DS-08 Checkbox / Radio / Switch ---------- */
function ChoiceShowcase() {
  return (
    <div className="flex w-full flex-wrap items-start gap-10">
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-medium">Checkbox</legend>
        <div className="flex items-center gap-2">
          <Checkbox id="ds-cb-1" defaultChecked />
          <Label htmlFor="ds-cb-1">Kena PPN</Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id="ds-cb-2" />
          <Label htmlFor="ds-cb-2">Termasuk ongkir</Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id="ds-cb-3" disabled />
          <Label htmlFor="ds-cb-3" className="opacity-50">
            Lunas (nonaktif)
          </Label>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-medium">Metode bayar</legend>
        <RadioGroup defaultValue="transfer" className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <RadioGroupItem value="transfer" id="ds-rb-1" />
            <Label htmlFor="ds-rb-1">Transfer</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="tunai" id="ds-rb-2" />
            <Label htmlFor="ds-rb-2">Tunai</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="tempo" id="ds-rb-3" disabled />
            <Label htmlFor="ds-rb-3" className="opacity-50">
              Tempo (nonaktif)
            </Label>
          </div>
        </RadioGroup>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-medium">Switch</legend>
        <div className="flex items-center gap-2">
          <Switch id="ds-sw-1" defaultChecked />
          <Label htmlFor="ds-sw-1">Kirim notifikasi</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="ds-sw-2" />
          <Label htmlFor="ds-sw-2">Arsipkan otomatis</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="ds-sw-3" disabled />
          <Label htmlFor="ds-sw-3" className="opacity-50">
            Mode demo (nonaktif)
          </Label>
        </div>
      </fieldset>
    </div>
  );
}

/* ---------- DS-09 Date picker ---------- */
function DatePickerShowcase() {
  const [open, setOpen] = React.useState(false);
  const [date, setDate] = React.useState<Date | undefined>(undefined);

  return (
    <div className="grid w-64 gap-1.5">
      <Label>Tanggal invoice</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon />
            {date ? format(date, "dd MMM yyyy", { locale: idLocale }) : "Pilih tanggal"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(d) => {
              setDate(d);
              setOpen(false);
            }}
            locale={idLocale}
            autoFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

/* ---------- DS-10 Date range picker ---------- */
function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function DateRangePickerShowcase() {
  const [open, setOpen] = React.useState(false);
  const [range, setRange] = React.useState<DateRange | undefined>(undefined);
  const today = new Date();

  function preset(kind: "bulan" | "kuartal" | "tahun") {
    if (kind === "bulan") {
      setRange({ from: startOfMonth(today), to: endOfMonth(today) });
    } else if (kind === "kuartal") {
      const q = Math.floor(today.getMonth() / 3);
      const from = new Date(today.getFullYear(), q * 3, 1);
      const to = new Date(today.getFullYear(), q * 3 + 3, 0);
      setRange({ from, to });
    } else {
      setRange({
        from: new Date(today.getFullYear(), 0, 1),
        to: new Date(today.getFullYear(), 11, 31),
      });
    }
  }

  const label =
    range?.from && range?.to
      ? `${format(range.from, "dd MMM yyyy", { locale: idLocale })} – ${format(range.to, "dd MMM yyyy", { locale: idLocale })}`
      : range?.from
        ? format(range.from, "dd MMM yyyy", { locale: idLocale })
        : "Pilih rentang";

  return (
    <div className="grid w-80 gap-1.5">
      <Label>Rentang laporan</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start font-normal",
              !range?.from && "text-muted-foreground"
            )}
          >
            <CalendarIcon />
            {label}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex flex-wrap gap-2 border-b border-border p-2">
            <Button size="sm" variant="outline" onClick={() => preset("bulan")}>
              Bulan ini
            </Button>
            <Button size="sm" variant="outline" onClick={() => preset("kuartal")}>
              Kuartal ini
            </Button>
            <Button size="sm" variant="outline" onClick={() => preset("tahun")}>
              Tahun ini
            </Button>
          </div>
          <Calendar
            mode="range"
            selected={range}
            onSelect={setRange}
            numberOfMonths={2}
            locale={idLocale}
            autoFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

/* ---------- DS-11 Input-OTP ---------- */
function OtpShowcase() {
  return (
    <div className="flex w-full flex-wrap items-start gap-10">
      <div className="grid gap-1.5">
        <Label>Kode aktivasi (terisi)</Label>
        <InputOTP maxLength={6} defaultValue="481592">
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
            <InputOTPSlot index={3} />
            <InputOTPSlot index={4} />
            <InputOTPSlot index={5} />
          </InputOTPGroup>
        </InputOTP>
      </div>

      <div className="grid gap-1.5">
        <Label>Kode aktivasi (fokus / kosong)</Label>
        <InputOTP maxLength={6} autoFocus>
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
            <InputOTPSlot index={3} />
            <InputOTPSlot index={4} />
            <InputOTPSlot index={5} />
          </InputOTPGroup>
        </InputOTP>
      </div>
    </div>
  );
}

/* ---------- Section assembly ---------- */
export function FormSection() {
  return (
    <>
      <ShowcaseSection
        id="form-tombol"
        title="Tombol"
        description="Varian, ukuran, status nonaktif & memuat, dan grup tombol tersegmentasi."
      >
        <ButtonShowcase />
      </ShowcaseSection>

      <ShowcaseSection
        id="form-input"
        title="Input & Form"
        description="Input, input-group, textarea, dan form validasi (React Hook Form + Zod)."
      >
        <InputShowcase />
        <TextareaShowcase />
        <FormShowcase />
      </ShowcaseSection>

      <ShowcaseSection
        id="form-pilihan"
        title="Pilihan & Tanggal"
        description="Select, combobox, checkbox/radio/switch, pemilih tanggal & rentang, dan OTP."
      >
        <SelectShowcase />
        <ComboboxShowcase />
        <ChoiceShowcase />
        <DatePickerShowcase />
        <DateRangePickerShowcase />
        <OtpShowcase />
      </ShowcaseSection>

      <ShowcaseSection
        id="form-uang-unggah"
        title="Khusus: Uang & Unggah"
        description="Input uang dengan terbilang otomatis dan area unggah berkas (mock)."
      >
        <div className="grid gap-1.5">
          <Label>Nominal</Label>
          <MoneyInput defaultValue={1500000} />
        </div>
        <div className="grid gap-1.5">
          <Label>Lampiran</Label>
          <FileDropzone />
        </div>
      </ShowcaseSection>
    </>
  );
}
