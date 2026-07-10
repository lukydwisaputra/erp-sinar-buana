import { describe, expect, it } from "vitest";
import { toMilestoneTemplate, type MilestoneTemplateRow, type MilestoneTemplateStepRow } from "@/lib/milestone-templates/mapping";

function template(overrides: Partial<MilestoneTemplateRow> = {}): MilestoneTemplateRow {
  return {
    id: "tpl-1", name: "Pertek 5 Tahap", description: null, isActive: true,
    createdAt: new Date(), updatedAt: new Date(),
    ...overrides,
  };
}

function step(overrides: Partial<MilestoneTemplateStepRow> = {}): MilestoneTemplateStepRow {
  return {
    id: "step-1", templateId: "tpl-1", name: "Langkah", sortOrder: 0, triggersTerm: false,
    createdAt: new Date(), updatedAt: new Date(),
    ...overrides,
  };
}

describe("toMilestoneTemplate", () => {
  it("sorts steps by sortOrder and maps triggersTerm through", () => {
    const result = toMilestoneTemplate(template(), [
      step({ id: "s2", name: "Kedua", sortOrder: 1, triggersTerm: true }),
      step({ id: "s1", name: "Pertama", sortOrder: 0 }),
    ]);
    expect(result.steps.map((s) => s.nama)).toEqual(["Pertama", "Kedua"]);
    expect(result.steps[1].triggersTerm).toBe(true);
  });

  it("returns an empty steps array when none exist", () => {
    expect(toMilestoneTemplate(template(), []).steps).toEqual([]);
  });
});
