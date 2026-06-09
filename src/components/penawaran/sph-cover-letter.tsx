import { Globe, Mail, MapPin, Phone } from "lucide-react";
import { companyProfile } from "@/lib/company-profile";
import { formatRupiah } from "@/lib/format";
import { terbilang } from "@/lib/terbilang";
import { totalPenawaran } from "@/lib/sph";
import type { SphFormValues } from "@/lib/schemas/penawaran";

/** Title-case a (space-separated) string — used on the terbilang amount. */
function titleCase(s: string): string {
  return s.replace(/\S+/g, (w) => w.charAt(0).toUpperCase() + w.slice(1));
}

function tglPanjang(iso: string): string {
  return iso
    ? new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
    : "—";
}

export function SphCoverLetter({
  values,
  noSph,
}: {
  values: SphFormValues;
  noSph: string;
}): React.JSX.Element {
  const total = totalPenawaran(values.items);

  return (
    <div className="sph-doc mx-auto w-full max-w-[210mm] bg-white text-[var(--sph-ink)] shadow-sm">
      {/* 1. Letterhead band ----------------------------------------------- */}
      <div className="relative flex items-stretch justify-between overflow-hidden">
        {/* Angled blue bars on the left ~60% (approximates the real angled
            letterhead; the actual logo image / brand bar drops in here). */}
        <div className="relative h-24 w-3/5">
          <div
            className="absolute inset-0 bg-[var(--sph-blue)]"
            style={{ clipPath: "polygon(0 0, 100% 0, 78% 100%, 0 100%)" }}
          />
          <div
            className="absolute inset-0 bg-[var(--sph-blue-2)]"
            style={{ clipPath: "polygon(0 55%, 88% 55%, 70% 100%, 0 100%)" }}
          />
        </div>
        {/* Right: configurable logo + company name + tagline. The identity
            block gets generous width so the full company name wraps to 1–2
            lines instead of being truncated. */}
        <div className="flex max-w-[60%] flex-col items-end justify-center px-8 py-3 text-right">
          {companyProfile.logo ? (
            <img src={companyProfile.logo} alt="Logo" className="size-14 object-contain" />
          ) : (
            <div className="flex size-14 items-center justify-center rounded-full border-2 border-[var(--sph-blue)] text-[var(--sph-blue)]">
              <span className="text-sm font-bold tracking-tight">SBMJ</span>
            </div>
          )}
          <p className="mt-1 whitespace-normal text-[11px] font-bold leading-tight text-[var(--sph-blue)]">
            {companyProfile.nama}
          </p>
          <p className="text-[10px] tracking-wide text-[var(--sph-blue-2)]">{companyProfile.tagline}</p>
        </div>
      </div>

      {/* Body -------------------------------------------------------------- */}
      <div className="px-8 pt-6 text-sm leading-relaxed">
        {/* 2. Letter meta */}
        <div className="flex items-start justify-between gap-6">
          <div className="grid grid-cols-[auto_auto_1fr] gap-x-2">
            <span>No</span>
            <span>:</span>
            <span className="font-mono">{noSph}</span>
            <span>Perihal</span>
            <span>:</span>
            <span>Surat Penawaran Harga</span>
            <span>Lampiran</span>
            <span>:</span>
            <span>{values.lampiran || "-"}</span>
          </div>
          <div className="shrink-0 text-right">
            <div>
              {companyProfile.kota}, {tglPanjang(values.tanggal)}
            </div>
          </div>
        </div>

        {/* 3. Kepada */}
        <div className="mt-6">
          <p>Kepada Yth.</p>
          <p>Bpk/Ibu Direktur</p>
          <p className="font-semibold">{values.perusahaanNama || "—"}</p>
          <p>Di Tempat</p>
        </div>

        {/* 4. Pembuka */}
        <p className="mt-6">Dengan Hormat,</p>
        <p className="mt-2 text-justify indent-8">{values.kalimatPembuka}</p>

        {/* 5. Service table */}
        <table className="mt-4 w-full border-collapse border border-[var(--sph-rule)] text-sm">
          <thead>
            <tr className="bg-[var(--sph-blue-soft)] text-center font-bold">
              <th className="border border-[var(--sph-rule)] px-2 py-1">No</th>
              <th className="border border-[var(--sph-rule)] px-2 py-1">Uraian</th>
              <th className="border border-[var(--sph-rule)] px-2 py-1">Biaya Satuan (Rp)</th>
              <th className="border border-[var(--sph-rule)] px-2 py-1">Banyaknya</th>
              <th className="border border-[var(--sph-rule)] px-2 py-1">Total (Rp)</th>
            </tr>
          </thead>
          <tbody>
            {values.items.length === 0 ? (
              <tr>
                <td colSpan={5} className="border border-[var(--sph-rule)] px-2 py-4 text-center">
                  Tambahkan layanan…
                </td>
              </tr>
            ) : (
              values.items.map((it, i) => (
                <tr key={i}>
                  <td className="border border-[var(--sph-rule)] px-2 py-1 text-center">{i + 1}</td>
                  <td className="border border-[var(--sph-rule)] px-2 py-1">{it.nama || "—"}</td>
                  <td className="border border-[var(--sph-rule)] px-2 py-1 text-right font-mono tabular-nums">
                    {formatRupiah(it.harga)}
                  </td>
                  <td className="border border-[var(--sph-rule)] px-2 py-1 text-center">
                    {it.volume} {it.satuan}
                  </td>
                  <td className="border border-[var(--sph-rule)] px-2 py-1 text-right font-mono tabular-nums">
                    {formatRupiah((Number(it.volume) || 0) * (Number(it.harga) || 0))}
                  </td>
                </tr>
              ))
            )}
            {/* Total Biaya */}
            <tr>
              <td
                colSpan={4}
                className="border border-[var(--sph-rule)] px-2 py-1 text-right font-bold"
              >
                TOTAL BIAYA
              </td>
              <td className="border border-[var(--sph-rule)] px-2 py-1 text-right font-mono font-bold tabular-nums">
                {formatRupiah(total)}
              </td>
            </tr>
            {/* Terbilang */}
            <tr>
              <td colSpan={5} className="border border-[var(--sph-rule)] px-2 py-1 text-center">
                <span className="font-semibold">Terbilang: </span>
                <span className="font-bold italic">{titleCase(terbilang(total))} Rupiah</span>
              </td>
            </tr>
          </tbody>
        </table>

        {/* 6. Catatan */}
        <div className="mt-4">
          <p className="font-bold">Catatan:</p>
          <ul className="list-disc pl-5 text-sm">
            {values.masaBerlakuAktif && (
              <li>Penawaran Harga berlaku {values.masaBerlakuHari} hari kalender</li>
            )}
            {values.catatan
              .filter((c) => c.trim())
              .map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            {values.termin.length > 0 && (
              <li>
                Termin pembayaran di bagi menjadi {values.termin.length} tahap:
                <ol className="list-decimal pl-5">
                  {values.termin.map((t, i) => (
                    <li key={i}>
                      {t.persen}% {t.pemicu || "—"}
                    </li>
                  ))}
                </ol>
              </li>
            )}
          </ul>
        </div>

        {/* 7. Penutup */}
        <p className="mt-4 indent-8 text-justify">
          Demikian penawaran harga tersebut kami sampaikan atas perhatian dan kerjasama kami ucapkan
          terimakasih.
        </p>

        {/* 8. Signature */}
        <div className="mt-8 flex flex-col items-end text-right">
          <p>Hormat Kami,</p>
          {/* Approximates the round company stamp. */}
          <div className="my-2 flex size-20 rotate-[-8deg] items-center justify-center rounded-full border-2 border-[var(--sph-blue)]/60 text-[var(--sph-blue)]/70">
            <span className="text-base font-bold tracking-tight">SBMJ</span>
          </div>
          <p className="font-bold underline">{companyProfile.direktur.nama}</p>
          <p className="font-bold">{companyProfile.direktur.jabatan}</p>
        </div>
      </div>

      {/* 9. Footer band ---------------------------------------------------- */}
      <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-1 bg-[var(--sph-blue-soft)] px-8 py-3 text-[11px] text-[var(--sph-blue)]">
        <span className="inline-flex items-center gap-1">
          <Phone className="size-3.5" /> {companyProfile.telepon}
        </span>
        <span className="inline-flex items-center gap-1">
          <Mail className="size-3.5" /> {companyProfile.email}
        </span>
        <span className="inline-flex items-center gap-1">
          <MapPin className="size-3.5" /> {companyProfile.alamat.join(" / ")}
        </span>
        <span className="inline-flex items-center gap-1">
          <Globe className="size-3.5" /> {companyProfile.website}
        </span>
      </div>
    </div>
  );
}
