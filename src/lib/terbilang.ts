const SATUAN = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"];

function toWords(n: number): string {
  if (n < 12) return SATUAN[n];
  if (n < 20) return `${toWords(n - 10)} belas`;
  if (n < 100) return `${toWords(Math.floor(n / 10))} puluh ${toWords(n % 10)}`.trim();
  if (n < 200) return `seratus ${toWords(n - 100)}`.trim();
  if (n < 1000) return `${toWords(Math.floor(n / 100))} ratus ${toWords(n % 100)}`.trim();
  if (n < 2000) return `seribu ${toWords(n - 1000)}`.trim();
  if (n < 1_000_000) return `${toWords(Math.floor(n / 1000))} ribu ${toWords(n % 1000)}`.trim();
  if (n < 1_000_000_000) return `${toWords(Math.floor(n / 1_000_000))} juta ${toWords(n % 1_000_000)}`.trim();
  const m = 1_000_000_000;
  return `${toWords(Math.floor(n / m))} miliar ${toWords(n % m)}`.trim();
}

export function terbilang(n: number): string {
  if (n === 0) return "nol";
  return toWords(Math.round(Math.abs(n))).replace(/\s+/g, " ").trim();
}
