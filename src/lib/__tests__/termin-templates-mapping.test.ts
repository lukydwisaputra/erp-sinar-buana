import { describe, expect, it } from "vitest";
import { toTerminTemplate, type TerminTemplateRow, type TerminTemplateStepRow } from "@/lib/termin-templates/mapping";

function template(overrides: Partial<TerminTemplateRow> = {}): TerminTemplateRow {
  return {
    id: "tpl-1", name: "Termin 3 Tahap Standar", isActive: true,
    createdAt: new Date(), updatedAt: new Date(),
    ...overrides,
  };
}

function step(overrides: Partial<TerminTemplateStepRow> = {}): TerminTemplateStepRow {
  return {
    id: "step-1", templateId: "tpl-1", label: "Termin I", percentage: "30.0000",
    milestoneTriggerLabel: null, sortOrder: 0,
    ...overrides,
  };
}

describe("toTerminTemplate", () => {
  it("sorts steps by sortOrder, converts percentage to number, maps null trigger to empty string", () => {
    const result = toTerminTemplate(template(), [
      step({ id: "s2", label: "Termin II", percentage: "40.0000", sortOrder: 1, milestoneTriggerLabel: "Draf selesai" }),
      step({ id: "s1", label: "Termin I", percentage: "30.0000", sortOrder: 0 }),
    ]);
    expect(result.steps.map((s) => s.label)).toEqual(["Termin I", "Termin II"]);
    expect(result.steps[0].persen).toBe(30);
    expect(result.steps[0].pemicu).toBe("");
    expect(result.steps[1].pemicu).toBe("Draf selesai");
  });
});
