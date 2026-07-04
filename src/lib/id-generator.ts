import Hashids from "hashids";

const h = (salt: string) => new Hashids(`sb-erp-${salt}`, 5);

const kry  = h("kry");
const lyn  = h("lyn");
const sph  = h("sph");
const prj  = h("prj");
const klg  = h("klg");

export const encodeKaryawan    = (n: number) => `KRY-${kry.encode(n)}`;
export const encodeLayanan     = (n: number) => `LYN-${lyn.encode(n)}`;
export const encodeKelengkapan = (n: number) => `KLG-${klg.encode(n)}`;

/** SPH/xxxxx/bulan.tahun */
export const encodeSph = (n: number, bulan: number, tahun: number) =>
  `SPH/${sph.encode(n)}/${bulan}.${tahun}`;

/** INV/xxxxx/tahun  (seq-part same as SPH) */
export const encodeInvBase = (sphSeq: number, tahun: number) =>
  `INV/${sph.encode(sphSeq)}/${tahun}`;

/** INV/xxxxx/tahun-T{terminIdx+1} */
export const encodeInvTermin = (sphSeq: number, tahun: number, terminIdx: number) =>
  `${encodeInvBase(sphSeq, tahun)}-T${terminIdx + 1}`;

/** PRJ/xxxxx/tahun — proyek berdiri sendiri (tidak ada SPH) */
export const encodeProyek = (n: number, tahun: number) =>
  `PRJ/${prj.encode(n)}/${tahun}`;

/** PRJ/xxxxx/tahun — berbagi hash dengan SPH (sphSeq = seq dari SPH asal) */
export const encodeProyekFromSph = (sphSeq: number, tahun: number) =>
  `PRJ/${sph.encode(sphSeq)}/${tahun}`;

/** Raw hashids encoder for proyek counter (used at runtime in data layer) */
export const proyekHashids = prj;

/** Raw hashids encoder for SPH counter (used at runtime in data layer) */
export const sphHashids = sph;
