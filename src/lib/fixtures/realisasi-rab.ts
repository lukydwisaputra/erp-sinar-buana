import type { RealisasiRab } from "@/lib/schemas/realisasi-rab";
import { proyekFixtures } from "@/lib/fixtures/proyek";

let seq = 0;
function nextId(): string {
  return `RRB-${String(++seq).padStart(4, "0")}`;
}

export function bumpSeq(): number {
  return ++seq;
}

/**
 * Seed actual cost against a subset of projects that are underway/delivered.
 * Personil ~35% and Langsung ~25% of nilaiKontrak, so plan-vs-actual margin is
 * meaningful (some on-track, one intentionally over-budget for 🔴 testing).
 */
function generate(): RealisasiRab[] {
  const rows: RealisasiRab[] = [];
  const active = proyekFixtures.filter(
    (p) => p.status === "on_track" || p.status === "terlambat" || p.status === "selesai",
  );
  active.forEach((p, i) => {
    // Make the 2nd active project over-budget (realisasi > a plausible RAB plan).
    const overBudget = i === 1;
    const personil = Math.round(p.nilaiKontrak * (overBudget ? 0.6 : 0.35));
    const langsung = Math.round(p.nilaiKontrak * (overBudget ? 0.45 : 0.25));
    rows.push({
      id: nextId(),
      proyekId: p.id,
      kategori: "personil",
      rabLineLabel: "Tenaga Ahli",
      jumlah: personil,
      tanggal: "2026-05-15",
      keterangan: `Realisasi personil — ${p.nama}`,
    });
    rows.push({
      id: nextId(),
      proyekId: p.id,
      kategori: "langsung",
      rabLineLabel: "Material & Operasional Lapangan",
      jumlah: langsung,
      tanggal: "2026-05-28",
      keterangan: `Realisasi biaya langsung — ${p.nama}`,
    });
  });
  return rows;
}

export const realisasiRabFixtures: RealisasiRab[] = generate();
