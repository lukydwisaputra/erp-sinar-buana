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
    const result = toLayanan(service(), documentType, authority, legalBasis);
    expect(result.jenisDokumen).toBe("Pertek");
    expect(result.kewenangan).toBe("Provinsi");
    expect(result.dasarHukum).toBe("PermenLHK No. 5 Tahun 2021");
  });

  it("falls back to '—' for jenisDokumen/kewenangan and null for dasarHukum when unresolved", () => {
    const result = toLayanan(service({ documentTypeId: null, authorityId: null, legalBasisId: null }), undefined, undefined, undefined);
    expect(result.jenisDokumen).toBe("—");
    expect(result.kewenangan).toBe("—");
    expect(result.dasarHukum).toBeNull();
  });

  it("maps is_active true/false to status aktif/terarsip", () => {
    expect(toLayanan(service({ isActive: true }), documentType, authority, legalBasis).status).toBe("aktif");
    expect(toLayanan(service({ isActive: false }), documentType, authority, legalBasis).status).toBe("terarsip");
  });

  it("converts standardPrice to a number, or null when unset", () => {
    expect(toLayanan(service({ standardPrice: "50000" }), documentType, authority, legalBasis).hargaStandar).toBe(50000);
    expect(toLayanan(service({ standardPrice: null }), documentType, authority, legalBasis).hargaStandar).toBeNull();
  });

  it("passes through isRecurring", () => {
    expect(toLayanan(service({ isRecurring: true }), documentType, authority, legalBasis).isRecurring).toBe(true);
  });
});

describe("computeMetrik", () => {
  it("returns zeroed metrik for a service name with no cross-referenced records", () => {
    expect(computeMetrik("Layanan yang tidak pernah dipakai")).toEqual({ dipakaiSPH: 0, dipakaiProyek: 0 });
  });

  it("counts SPH usage for a seeded demo service name", () => {
    // "Penyusunan Pertek Air Limbah" is used by fixtures/penawaran.ts's SPH items.
    const metrik = computeMetrik("Penyusunan Pertek Air Limbah");
    expect(metrik.dipakaiSPH).toBeGreaterThan(0);
  });
});
