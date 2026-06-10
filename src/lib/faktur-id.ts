/**
 * Derives invoice identifiers from an SPH ID.
 *
 * SPH format:  SPH/{seq}/{month}.{year}  e.g. "SPH/001/5.2026"
 * Inv base:    INV/{seq}/{year}           e.g. "INV/001/2026"
 * Termin ID:   {base}-T{terminIndex + 1} e.g. "INV/001/2026-T1"
 */
export function sphIdToInvBase(sphId: string): string {
  const parts = sphId.split("/");
  const seq = parts[1];
  const year = parts[2].split(".")[1];
  return `INV/${seq}/${year}`;
}

export function terminFakturId(invBase: string, terminIndex: number): string {
  return `${invBase}-T${terminIndex + 1}`;
}
