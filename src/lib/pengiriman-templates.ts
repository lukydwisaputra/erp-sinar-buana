export type JenisDokumenKirim = "sph" | "faktur" | "slip";

export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  return `62${digits}`;
}

const WA_TEMPLATES: Record<JenisDokumenKirim, string> = {
  sph: "Yth. {perusahaan},\n\nBerikut kami sampaikan Surat Penawaran Harga No. {nomor}. Mohon dapat diperiksa, PDF terlampir.\n\nTerima kasih.",
  faktur: "Yth. {perusahaan},\n\nBerikut kami sampaikan Invoice No. {nomor}. PDF terlampir.\n\nTerima kasih.",
  slip: "Yth. {perusahaan},\n\nBerikut slip gaji Anda No. {nomor}. PDF terlampir.\n\nTerima kasih.",
};

export function buildPesanWa(jenis: JenisDokumenKirim, data: { perusahaan: string; nomor: string }): string {
  return WA_TEMPLATES[jenis]
    .replaceAll("{perusahaan}", data.perusahaan)
    .replaceAll("{nomor}", data.nomor);
}

export function buildWaLink(telepon: string, pesan: string): string {
  return `https://wa.me/${normalizePhone(telepon)}?text=${encodeURIComponent(pesan)}`;
}
