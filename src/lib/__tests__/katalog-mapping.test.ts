import { describe, it, expect } from "vitest";
import { toLayanan, computeMetrik } from "@/lib/katalog/mapping";

function service(overrides: Partial<Parameters<typeof toLayanan>[0]> = {}) {
  return {
    id: "svc-1",
    name: "Penyusunan Pertek Air Limbah",
    documentTypeId: "doc-1",
    authorityId: "auth-1",
    legalBasisId: "legal-1",
    standardPrice: "75000000",
    isRecurring: false,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: null,
    updatedBy: null,
    deletedAt: null,
    deletedBy: null,
    ...overrides,
  };
}

const documentType = { id: "doc-1", label: "Pertek", isActive: true, sortOrder: 1, createdAt: new Date(), updatedAt: new Date() };
const authority = { id: "auth-1", label: "Provinsi", isActive: true, sortOrder: 1, createdAt: new Date(), updatedAt: new Date() };
const legalBasis = { id: "legal-1", label: "PermenLHK No. 5 Tahun 2021", isActive: true, sortOrder: 1, createdAt: new Date(), updatedAt: new Date() };

describe("toLayanan", () => {
  it("resolves document type/authority/legal basis labels", () => {
    const result = toLayanan(service(), documentType, authority, legalBasis, 0);
    expect(result.jenisDokumen).toBe("Pertek");
    expect(result.kewenangan).toBe("Provinsi");
    expect(result.dasarHukum).toBe("PermenLHK No. 5 Tahun 2021");
  });

  it("falls back to '—' for jenisDokumen/kewenangan and null for dasarHukum when unresolved", () => {
    const result = toLayanan(service({ documentTypeId: null, authorityId: null, legalBasisId: null }), undefined, undefined, undefined, 0);
    expect(result.jenisDokumen).toBe("—");
    expect(result.kewenangan).toBe("—");
    expect(result.dasarHukum).toBeNull();
  });

  it("maps is_active true/false to status aktif/terarsip", () => {
    expect(toLayanan(service({ isActive: true }), documentType, authority, legalBasis, 0).status).toBe("aktif");
    expect(toLayanan(service({ isActive: false }), documentType, authority, legalBasis, 0).status).toBe("terarsip");
  });

  it("converts standardPrice to a number, or null when unset", () => {
    expect(toLayanan(service({ standardPrice: "50000" }), documentType, authority, legalBasis, 0).hargaStandar).toBe(50000);
    expect(toLayanan(service({ standardPrice: null }), documentType, authority, legalBasis, 0).hargaStandar).toBeNull();
  });

  it("passes through isRecurring", () => {
    expect(toLayanan(service({ isRecurring: true }), documentType, authority, legalBasis, 0).isRecurring).toBe(true);
  });

  it("passes through the real dipakaiSPH count", () => {
    expect(toLayanan(service(), documentType, authority, legalBasis, 7).metrik.dipakaiSPH).toBe(7);
  });
});

describe("computeMetrik", () => {
  it("returns the given dipakaiSPH count and 0 dipakaiProyek for a name with no mock Proyek cross-reference", () => {
    expect(computeMetrik("Layanan yang tidak pernah dipakai", 3)).toEqual({ dipakaiSPH: 3, dipakaiProyek: 0 });
  });

  it("counts Proyek usage for a seeded demo service name (Proyek stays mock)", () => {
    // "Penyusunan Pertek Air Limbah" is used by fixtures/proyek.ts's layananNama.
    const metrik = computeMetrik("Penyusunan Pertek Air Limbah", 0);
    expect(metrik.dipakaiProyek).toBeGreaterThan(0);
  });
});
