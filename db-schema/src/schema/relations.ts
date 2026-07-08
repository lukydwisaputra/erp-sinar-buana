/**
 * Drizzle relations — enable the relational query API (db.query.*.findMany with
 * `with: {...}`). These mirror the foreign keys declared in the table files.
 */
import { relations } from "drizzle-orm";
import { authTokens, sessions, userProfiles } from "./auth";
import {
  companies,
  companyContacts,
  employees,
  employeeSalaryComponents,
  milestoneTemplates,
  milestoneTemplateSteps,
  serviceCatalog,
} from "./master-data";
import { salaryComponents } from "./config";
import {
  quotations,
  quotationItems,
  quotationTermScheme,
  quotationRabPersonnel,
  quotationRabDirectCosts,
} from "./quotations";
import {
  activitySchedules,
  activityScheduleRows,
  activityScheduleMarkedWeeks,
} from "./schedules";
import {
  projects,
  projectServices,
  projectAssignees,
  milestones,
  milestoneAssignees,
  projectComments,
  commentMentions,
  projectStatusLog,
} from "./projects";
import {
  masterInvoices,
  masterInvoiceServices,
  masterInvoiceTerms,
  installmentInvoices,
} from "./billing";
import { payslips, payslipComponents } from "./payroll";
import { cashflowEntries } from "./cashflow";
import { rabActuals } from "./profitability";
import { taxEntries } from "./tax";
import { attachments } from "./attachments";
import { documentDeliveries } from "./deliveries";

// ── Identity ──────────────────────────────────────────────────────────────────
export const userProfilesRelations = relations(userProfiles, ({ one, many }) => ({
  employee: one(employees, {
    fields: [userProfiles.employeeId],
    references: [employees.id],
  }),
  sessions: many(sessions),
  authTokens: many(authTokens),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(userProfiles, {
    fields: [sessions.userId],
    references: [userProfiles.id],
  }),
}));

export const authTokensRelations = relations(authTokens, ({ one }) => ({
  user: one(userProfiles, {
    fields: [authTokens.userId],
    references: [userProfiles.id],
  }),
}));

// ── Master data ───────────────────────────────────────────────────────────────
export const companiesRelations = relations(companies, ({ many }) => ({
  contacts: many(companyContacts),
  quotations: many(quotations),
  projects: many(projects),
}));

export const companyContactsRelations = relations(
  companyContacts,
  ({ one }) => ({
    company: one(companies, {
      fields: [companyContacts.companyId],
      references: [companies.id],
    }),
  }),
);

export const employeesRelations = relations(employees, ({ many }) => ({
  salaryComponents: many(employeeSalaryComponents),
  assignments: many(projectAssignees),
  payslips: many(payslips),
}));

export const employeeSalaryComponentsRelations = relations(
  employeeSalaryComponents,
  ({ one }) => ({
    employee: one(employees, {
      fields: [employeeSalaryComponents.employeeId],
      references: [employees.id],
    }),
    component: one(salaryComponents, {
      fields: [employeeSalaryComponents.salaryComponentId],
      references: [salaryComponents.id],
    }),
  }),
);

export const milestoneTemplatesRelations = relations(
  milestoneTemplates,
  ({ many }) => ({
    steps: many(milestoneTemplateSteps),
    services: many(serviceCatalog),
  }),
);

export const milestoneTemplateStepsRelations = relations(
  milestoneTemplateSteps,
  ({ one }) => ({
    template: one(milestoneTemplates, {
      fields: [milestoneTemplateSteps.templateId],
      references: [milestoneTemplates.id],
    }),
  }),
);

export const serviceCatalogRelations = relations(serviceCatalog, ({ one }) => ({
  milestoneTemplate: one(milestoneTemplates, {
    fields: [serviceCatalog.milestoneTemplateId],
    references: [milestoneTemplates.id],
  }),
}));

// ── Quotations ────────────────────────────────────────────────────────────────
export const quotationsRelations = relations(quotations, ({ one, many }) => ({
  company: one(companies, {
    fields: [quotations.companyId],
    references: [companies.id],
  }),
  contact: one(companyContacts, {
    fields: [quotations.contactId],
    references: [companyContacts.id],
  }),
  items: many(quotationItems),
  termScheme: many(quotationTermScheme),
  rabPersonnel: many(quotationRabPersonnel),
  rabDirectCosts: many(quotationRabDirectCosts),
  schedules: many(activitySchedules),
  deliveries: many(documentDeliveries),
}));

export const quotationItemsRelations = relations(quotationItems, ({ one }) => ({
  quotation: one(quotations, {
    fields: [quotationItems.quotationId],
    references: [quotations.id],
  }),
  service: one(serviceCatalog, {
    fields: [quotationItems.serviceId],
    references: [serviceCatalog.id],
  }),
}));

export const quotationTermSchemeRelations = relations(
  quotationTermScheme,
  ({ one }) => ({
    quotation: one(quotations, {
      fields: [quotationTermScheme.quotationId],
      references: [quotations.id],
    }),
  }),
);

export const quotationRabPersonnelRelations = relations(
  quotationRabPersonnel,
  ({ one }) => ({
    quotation: one(quotations, {
      fields: [quotationRabPersonnel.quotationId],
      references: [quotations.id],
    }),
  }),
);

export const quotationRabDirectCostsRelations = relations(
  quotationRabDirectCosts,
  ({ one }) => ({
    quotation: one(quotations, {
      fields: [quotationRabDirectCosts.quotationId],
      references: [quotations.id],
    }),
  }),
);

// ── Activity schedule ─────────────────────────────────────────────────────────
export const activitySchedulesRelations = relations(
  activitySchedules,
  ({ one, many }) => ({
    quotation: one(quotations, {
      fields: [activitySchedules.quotationId],
      references: [quotations.id],
    }),
    project: one(projects, {
      fields: [activitySchedules.projectId],
      references: [projects.id],
    }),
    rows: many(activityScheduleRows),
  }),
);

export const activityScheduleRowsRelations = relations(
  activityScheduleRows,
  ({ one, many }) => ({
    schedule: one(activitySchedules, {
      fields: [activityScheduleRows.scheduleId],
      references: [activitySchedules.id],
    }),
    milestone: one(milestones, {
      fields: [activityScheduleRows.milestoneId],
      references: [milestones.id],
    }),
    markedWeeks: many(activityScheduleMarkedWeeks),
  }),
);

export const activityScheduleMarkedWeeksRelations = relations(
  activityScheduleMarkedWeeks,
  ({ one }) => ({
    row: one(activityScheduleRows, {
      fields: [activityScheduleMarkedWeeks.rowId],
      references: [activityScheduleRows.id],
    }),
  }),
);

// ── Projects ──────────────────────────────────────────────────────────────────
export const projectsRelations = relations(projects, ({ one, many }) => ({
  company: one(companies, {
    fields: [projects.companyId],
    references: [companies.id],
  }),
  quotation: one(quotations, {
    fields: [projects.quotationId],
    references: [quotations.id],
  }),
  services: many(projectServices),
  assignees: many(projectAssignees),
  milestones: many(milestones),
  comments: many(projectComments),
  statusLog: many(projectStatusLog),
  masterInvoices: many(masterInvoices),
  schedules: many(activitySchedules),
  rabActuals: many(rabActuals),
  cashflowEntries: many(cashflowEntries),
}));

export const projectServicesRelations = relations(
  projectServices,
  ({ one }) => ({
    project: one(projects, {
      fields: [projectServices.projectId],
      references: [projects.id],
    }),
    service: one(serviceCatalog, {
      fields: [projectServices.serviceId],
      references: [serviceCatalog.id],
    }),
  }),
);

export const projectAssigneesRelations = relations(
  projectAssignees,
  ({ one }) => ({
    project: one(projects, {
      fields: [projectAssignees.projectId],
      references: [projects.id],
    }),
    employee: one(employees, {
      fields: [projectAssignees.employeeId],
      references: [employees.id],
    }),
  }),
);

export const milestonesRelations = relations(milestones, ({ one, many }) => ({
  project: one(projects, {
    fields: [milestones.projectId],
    references: [projects.id],
  }),
  parent: one(milestones, {
    fields: [milestones.parentId],
    references: [milestones.id],
    relationName: "milestoneParent",
  }),
  children: many(milestones, { relationName: "milestoneParent" }),
  assignee: one(employees, {
    fields: [milestones.assigneeEmployeeId],
    references: [employees.id],
  }),
  assignees: many(milestoneAssignees),
  linkedMasterInvoice: one(masterInvoices, {
    fields: [milestones.linkedMasterInvoiceId],
    references: [masterInvoices.id],
  }),
}));

export const milestoneAssigneesRelations = relations(
  milestoneAssignees,
  ({ one }) => ({
    milestone: one(milestones, {
      fields: [milestoneAssignees.milestoneId],
      references: [milestones.id],
    }),
    employee: one(employees, {
      fields: [milestoneAssignees.employeeId],
      references: [employees.id],
    }),
  }),
);

export const projectCommentsRelations = relations(
  projectComments,
  ({ one, many }) => ({
    project: one(projects, {
      fields: [projectComments.projectId],
      references: [projects.id],
    }),
    author: one(userProfiles, {
      fields: [projectComments.authorId],
      references: [userProfiles.id],
    }),
    mentions: many(commentMentions),
    attachments: many(attachments),
  }),
);

export const commentMentionsRelations = relations(
  commentMentions,
  ({ one }) => ({
    comment: one(projectComments, {
      fields: [commentMentions.commentId],
      references: [projectComments.id],
    }),
    mentionedUser: one(userProfiles, {
      fields: [commentMentions.mentionedUserId],
      references: [userProfiles.id],
    }),
  }),
);

export const projectStatusLogRelations = relations(
  projectStatusLog,
  ({ one }) => ({
    project: one(projects, {
      fields: [projectStatusLog.projectId],
      references: [projects.id],
    }),
  }),
);

// ── Billing ───────────────────────────────────────────────────────────────────
export const masterInvoicesRelations = relations(
  masterInvoices,
  ({ one, many }) => ({
    project: one(projects, {
      fields: [masterInvoices.projectId],
      references: [projects.id],
    }),
    company: one(companies, {
      fields: [masterInvoices.companyId],
      references: [companies.id],
    }),
    services: many(masterInvoiceServices),
    terms: many(masterInvoiceTerms),
    installments: many(installmentInvoices),
  }),
);

export const masterInvoiceServicesRelations = relations(
  masterInvoiceServices,
  ({ one }) => ({
    masterInvoice: one(masterInvoices, {
      fields: [masterInvoiceServices.masterInvoiceId],
      references: [masterInvoices.id],
    }),
    service: one(serviceCatalog, {
      fields: [masterInvoiceServices.serviceId],
      references: [serviceCatalog.id],
    }),
  }),
);

export const masterInvoiceTermsRelations = relations(
  masterInvoiceTerms,
  ({ one, many }) => ({
    masterInvoice: one(masterInvoices, {
      fields: [masterInvoiceTerms.masterInvoiceId],
      references: [masterInvoices.id],
    }),
    installments: many(installmentInvoices),
  }),
);

export const installmentInvoicesRelations = relations(
  installmentInvoices,
  ({ one, many }) => ({
    masterInvoice: one(masterInvoices, {
      fields: [installmentInvoices.masterInvoiceId],
      references: [masterInvoices.id],
    }),
    term: one(masterInvoiceTerms, {
      fields: [installmentInvoices.termId],
      references: [masterInvoiceTerms.id],
    }),
    cashflowEntries: many(cashflowEntries),
    taxEntries: many(taxEntries),
    attachments: many(attachments),
    deliveries: many(documentDeliveries),
  }),
);

// ── Payroll ───────────────────────────────────────────────────────────────────
export const payslipsRelations = relations(payslips, ({ one, many }) => ({
  employee: one(employees, {
    fields: [payslips.employeeId],
    references: [employees.id],
  }),
  components: many(payslipComponents),
  cashflowEntries: many(cashflowEntries),
  taxEntries: many(taxEntries),
  attachments: many(attachments),
  deliveries: many(documentDeliveries),
}));

export const payslipComponentsRelations = relations(
  payslipComponents,
  ({ one }) => ({
    payslip: one(payslips, {
      fields: [payslipComponents.payslipId],
      references: [payslips.id],
    }),
  }),
);

// ── Cashflow & Tax ────────────────────────────────────────────────────────────
export const cashflowEntriesRelations = relations(
  cashflowEntries,
  ({ one }) => ({
    installmentInvoice: one(installmentInvoices, {
      fields: [cashflowEntries.installmentInvoiceId],
      references: [installmentInvoices.id],
    }),
    payslip: one(payslips, {
      fields: [cashflowEntries.payslipId],
      references: [payslips.id],
    }),
    taxEntry: one(taxEntries, {
      fields: [cashflowEntries.taxEntryId],
      references: [taxEntries.id],
    }),
    project: one(projects, {
      fields: [cashflowEntries.projectId],
      references: [projects.id],
    }),
  }),
);

// ── Profitability — Realisasi RAB ─────────────────────────────────────────────
export const rabActualsRelations = relations(rabActuals, ({ one }) => ({
  project: one(projects, {
    fields: [rabActuals.projectId],
    references: [projects.id],
  }),
  cashflowEntry: one(cashflowEntries, {
    fields: [rabActuals.cashflowEntryId],
    references: [cashflowEntries.id],
  }),
}));

export const taxEntriesRelations = relations(taxEntries, ({ one, many }) => ({
  installmentInvoice: one(installmentInvoices, {
    fields: [taxEntries.installmentInvoiceId],
    references: [installmentInvoices.id],
  }),
  payslip: one(payslips, {
    fields: [taxEntries.payslipId],
    references: [payslips.id],
  }),
  attachments: many(attachments),
}));

// ── Attachments ───────────────────────────────────────────────────────────────
export const attachmentsRelations = relations(attachments, ({ one }) => ({
  comment: one(projectComments, {
    fields: [attachments.commentId],
    references: [projectComments.id],
  }),
  taxEntry: one(taxEntries, {
    fields: [attachments.taxEntryId],
    references: [taxEntries.id],
  }),
  installmentInvoice: one(installmentInvoices, {
    fields: [attachments.installmentInvoiceId],
    references: [installmentInvoices.id],
  }),
  payslip: one(payslips, {
    fields: [attachments.payslipId],
    references: [payslips.id],
  }),
}));

// ── Pengiriman Dokumen ────────────────────────────────────────────────────────
export const documentDeliveriesRelations = relations(
  documentDeliveries,
  ({ one }) => ({
    quotation: one(quotations, {
      fields: [documentDeliveries.quotationId],
      references: [quotations.id],
    }),
    installmentInvoice: one(installmentInvoices, {
      fields: [documentDeliveries.installmentInvoiceId],
      references: [installmentInvoices.id],
    }),
    payslip: one(payslips, {
      fields: [documentDeliveries.payslipId],
      references: [payslips.id],
    }),
    createdByUser: one(userProfiles, {
      fields: [documentDeliveries.createdBy],
      references: [userProfiles.id],
    }),
  }),
);
