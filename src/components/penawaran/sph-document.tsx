import { DocumentPaper } from "@/components/shared/document-paper";
import { Badge } from "@/components/ui/badge";
import { Leaf } from "lucide-react";
import { formatRupiah } from "@/lib/format";
import { terbilang } from "@/lib/terbilang";
import { totalPenawaran } from "@/lib/sph";
import type { SphFormValues, SphStatus } from "@/lib/schemas/penawaran";

function tgl(iso: string) {
  return iso ? new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "—";
}

const STATUS_LABEL: Record<SphStatus, { label: string; variant: "info" | "warning" | "success" }> = {
  draft: { label: "Draft", variant: "info" },
  terkirim: { label: "Leads - Terkirim", variant: "warning" },
  deal: { label: "Convert - Deal", variant: "success" },
};

export function SphDocument({ values, noSph, status }: { values: SphFormValues; noSph: string; status?: SphStatus }) {
  const total = totalPenawaran(values.items);
  return (
    <DocumentPaper>
      {/* Kop */}
      <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground"><Leaf className="size-5" /></div>
          <div>
            <p className="text-sm font-semibold">PT Sinar Buana Mandiri Jaya</p>
            <p className="text-xs text-muted-foreground">Konsultan Lingkungan</p>
          </div>
        </div>
        <div className="text-right text-xs">
          <p className="font-mono font-semibold">{noSph}</p>
          <p className="text-muted-foreground">Tanggal: {tgl(values.tanggal)}</p>
          <p className="text-muted-foreground">Masa berlaku: {values.masaBerlaku || 0} hari</p>
        </div>
      </div>

      {/* Kepada */}
      <div className="text-sm">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Kepada</p>
        <p className="font-medium">{values.perusahaanNama || "Pilih perusahaan…"}</p>
        {values.pic && <p className="text-muted-foreground">u.p. {values.pic}</p>}
        {values.alamat && <p className="text-muted-foreground">{values.alamat}</p>}
      </div>

      {/* Layanan */}
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
            <th className="py-2 font-medium">Uraian Layanan</th>
            <th className="py-2 text-center font-medium">Vol</th>
            <th className="py-2 text-right font-medium">Harga</th>
            <th className="py-2 text-right font-medium">Jumlah</th>
          </tr>
        </thead>
        <tbody>
          {values.items.length === 0 ? (
            <tr><td colSpan={4} className="py-4 text-center text-muted-foreground">Tambahkan layanan…</td></tr>
          ) : values.items.map((it, i) => (
            <tr key={i} className="border-b border-border/60">
              <td className="py-2">{it.nama || "—"}</td>
              <td className="py-2 text-center font-mono tabular-nums">{it.volume}</td>
              <td className="py-2 text-right font-mono tabular-nums">{formatRupiah(it.harga)}</td>
              <td className="py-2 text-right font-mono tabular-nums">{formatRupiah(it.volume * it.harga)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Total + terbilang */}
      <div className="space-y-1 border-t border-border pt-3 text-sm">
        <div className="flex justify-between font-semibold">
          <span>Total Penawaran</span><span className="font-mono tabular-nums">{formatRupiah(total)}</span>
        </div>
        {total > 0 && <p className="text-xs italic text-muted-foreground capitalize">{terbilang(total)} rupiah</p>}
      </div>

      {/* Termin */}
      {values.termin.length > 0 && (
        <div className="text-sm">
          <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Skema Termin</p>
          <ul className="space-y-1">
            {values.termin.map((t, i) => (
              <li key={i} className="flex justify-between">
                <span>{t.label} — {t.pemicu || "—"}</span>
                <span className="font-mono tabular-nums">{t.persen}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Catatan */}
      {values.catatan && (
        <div className="text-sm">
          <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Catatan &amp; Ketentuan</p>
          <p className="whitespace-pre-wrap text-muted-foreground">{values.catatan}</p>
        </div>
      )}

      {status && (
        <div><Badge variant={STATUS_LABEL[status].variant}>{STATUS_LABEL[status].label}</Badge></div>
      )}
    </DocumentPaper>
  );
}
