import { describe, it, expect } from "vitest";
import { toLayanan, computeMetrik } from "@/lib/katalog/mapping";

function service(overrides: Partial<Parameters<typeof toLayanan>[0]> = {}) {
  return {
    id: "svc-1",
    number: null,
    numberYear: null,
    numberMonth: null,
    name: "Penyusunan Pertek Air Limbah",
    documentTypeId: "doc-1",
    authorityId: "auth-1",
    legalBasisId: "legal-1",
    standardPrice: "75000000",
    milestoneTemplateId: null,
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
const milestoneTemplate = { id: "mt-1", name: "Pertek 5 Tahap", description: null, isActive: true, createdAt: new Date(), updatedAt: new Date() };

describe("toLayanan", () => {
  it("resolves document type/authority/legal basis labels", () => {
    const result = toLayanan(service(), documentType, authority, legalBasis, undefined, 0, 0);
    expect(result.jenisDokumen).toBe("Pertek");
    expect(result.kewenangan).toBe("Provinsi");
    expect(result.dasarHukum).toBe("PermenLHK No. 5 Tahun 2021");
  });

  it("falls back to '—' for jenisDokumen/kewenangan and null for dasarHukum when unresolved", () => {
    const result = toLayanan(service({ documentTypeId: null, authorityId: null, legalBasisId: null }), undefined, undefined, undefined, undefined, 0, 0);
    expect(result.jenisDokumen).toBe("—");
    expect(result.kewenangan).toBe("—");
    expect(result.dasarHukum).toBeNull();
  });

  it("maps is_active true/false to status aktif/terarsip", () => {
    expect(toLayanan(service({ isActive: true }), documentType, authority, legalBasis, undefined, 0, 0).status).toBe("aktif");
    expect(toLayanan(service({ isActive: false }), documentType, authority, legalBasis, undefined, 0, 0).status).toBe("terarsip");
  });

  it("converts standardPrice to a number, or null when unset", () => {
    expect(toLayanan(service({ standardPrice: "50000" }), documentType, authority, legalBasis, undefined, 0, 0).hargaStandar).toBe(50000);
    expect(toLayanan(service({ standardPrice: null }), documentType, authority, legalBasis, undefined, 0, 0).hargaStandar).toBeNull();
  });

  it("resolves milestoneTemplateNama when a milestone template is linked, null otherwise", () => {
    const linked = toLayanan(service({ milestoneTemplateId: "mt-1" }), documentType, authority, legalBasis, milestoneTemplate, 0, 0);
    expect(linked.milestoneTemplateId).toBe("mt-1");
    expect(linked.milestoneTemplateNama).toBe("Pertek 5 Tahap");

    const unlinked = toLayanan(service(), documentType, authority, legalBasis, undefined, 0, 0);
    expect(unlinked.milestoneTemplateId).toBeNull();
    expect(unlinked.milestoneTemplateNama).toBeNull();
  });

  it("passes through the real dipakaiSPH/dipakaiProyek counts", () => {
    const result = toLayanan(service(), documentType, authority, legalBasis, undefined, 7, 4);
    expect(result.metrik.dipakaiSPH).toBe(7);
    expect(result.metrik.dipakaiProyek).toBe(4);
  });
});

describe("computeMetrik", () => {
  it("passes through the given dipakaiSPH/dipakaiProyek counts", () => {
    expect(computeMetrik(3, 5)).toEqual({ dipakaiSPH: 3, dipakaiProyek: 5 });
  });

  it("defaults to zero when neither count is provided", () => {
    expect(computeMetrik(0, 0)).toEqual({ dipakaiSPH: 0, dipakaiProyek: 0 });
  });
});
