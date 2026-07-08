-- ============================================================================
-- Indexes (performance) + partial-unique constraints (soft delete & doc numbers)
-- Apply AFTER the Drizzle migration (migrations/0000_init.sql).
--
-- The Drizzle migration creates PKs and the declared UNIQUE constraints. This
-- file adds foreign-key indexes for join/filter performance and the soft-delete-
-- aware unique indexes that can't be expressed in the Drizzle schema.
-- ============================================================================

-- ── Foreign-key / hot-filter indexes ────────────────────────────────────────
create index if not exists idx_sessions_user on sessions (user_id);
create index if not exists idx_auth_tokens_user on auth_tokens (user_id);
create index if not exists idx_company_contacts_company on company_contacts (company_id);
create index if not exists idx_service_catalog_doc_type on service_catalog (document_type_id);
create index if not exists idx_employees_position on employees (position_id);
create index if not exists idx_employees_status on employees (employment_status_id);
create index if not exists idx_emp_salary_comp_employee on employee_salary_components (employee_id);

create index if not exists idx_quotations_company on quotations (company_id);
create index if not exists idx_quotations_status on quotations (status_id);
create index if not exists idx_quotation_items_quotation on quotation_items (quotation_id);
create index if not exists idx_quotation_terms_quotation on quotation_term_scheme (quotation_id);
create index if not exists idx_quotation_rab_pers_quotation on quotation_rab_personnel (quotation_id);
create index if not exists idx_quotation_rab_pers_item on quotation_rab_personnel (quotation_item_id);
create index if not exists idx_quotation_rab_direct_quotation on quotation_rab_direct_costs (quotation_id);
create index if not exists idx_quotation_rab_direct_item on quotation_rab_direct_costs (quotation_item_id);

create index if not exists idx_schedules_quotation on activity_schedules (quotation_id);
create index if not exists idx_schedules_item on activity_schedules (quotation_item_id);
create index if not exists idx_schedules_project on activity_schedules (project_id);
create index if not exists idx_schedule_rows_schedule on activity_schedule_rows (schedule_id);
create index if not exists idx_schedule_marks_row on activity_schedule_marked_weeks (row_id);

create index if not exists idx_projects_company on projects (company_id);
create index if not exists idx_projects_status on projects (status_id);
create index if not exists idx_project_services_project on project_services (project_id);
create index if not exists idx_project_assignees_project on project_assignees (project_id);
create index if not exists idx_project_assignees_employee on project_assignees (employee_id);
create index if not exists idx_milestones_project on milestones (project_id);
create index if not exists idx_milestones_parent on milestones (parent_id);
create index if not exists idx_milestones_assignee on milestones (assignee_employee_id);
create index if not exists idx_milestones_master_invoice on milestones (linked_master_invoice_id);
create index if not exists idx_milestone_assignees_milestone on milestone_assignees (milestone_id);
create index if not exists idx_milestone_assignees_employee on milestone_assignees (employee_id);
create index if not exists idx_project_comments_project on project_comments (project_id);
create index if not exists idx_project_comments_milestone on project_comments (milestone_id);
create index if not exists idx_comment_mentions_user on comment_mentions (mentioned_user_id);
create index if not exists idx_project_status_log_project on project_status_log (project_id);

create index if not exists idx_master_invoices_project on master_invoices (project_id);
create index if not exists idx_master_invoices_company on master_invoices (company_id);
create index if not exists idx_master_invoice_services_mi on master_invoice_services (master_invoice_id);
create index if not exists idx_master_invoice_terms_mi on master_invoice_terms (master_invoice_id);
create index if not exists idx_installments_master on installment_invoices (master_invoice_id);
create index if not exists idx_installments_status on installment_invoices (status_id);
create index if not exists idx_installments_due on installment_invoices (due_date);

create index if not exists idx_payslips_employee on payslips (employee_id);
create index if not exists idx_payslips_status on payslips (status_id);
create index if not exists idx_payslip_components_payslip on payslip_components (payslip_id);

create index if not exists idx_cashflow_category on cashflow_entries (category_id);
create index if not exists idx_cashflow_date on cashflow_entries (date);
create index if not exists idx_cashflow_invoice on cashflow_entries (installment_invoice_id);
create index if not exists idx_cashflow_payslip on cashflow_entries (payslip_id);
create index if not exists idx_cashflow_tax on cashflow_entries (tax_entry_id);

create index if not exists idx_tax_entries_invoice on tax_entries (installment_invoice_id);
create index if not exists idx_tax_entries_payslip on tax_entries (payslip_id);
create index if not exists idx_tax_entries_period on tax_entries (tax_period);
create index if not exists idx_tax_entries_status on tax_entries (settlement_status);
create index if not exists idx_tax_entries_due on tax_entries (due_date);

create index if not exists idx_audit_log_record on audit_log (table_name, record_id);
create index if not exists idx_notifications_user on notifications (user_id, is_read);
create index if not exists idx_notifications_scheduled on notifications (scheduled_for);
create index if not exists idx_attachments_comment on attachments (comment_id);
create index if not exists idx_attachments_tax on attachments (tax_entry_id);
create index if not exists idx_attachments_invoice on attachments (installment_invoice_id);
create index if not exists idx_attachments_payslip on attachments (payslip_id);

-- ── Soft-delete-aware partial indexes ───────────────────────────────────────
-- Document numbers are unique among live rows (immutable once assigned).
create unique index if not exists uq_quotations_number_live
  on quotations (number) where number is not null and deleted_at is null;
create unique index if not exists uq_installments_number_live
  on installment_invoices (number) where number is not null and deleted_at is null;

-- Fast "live rows only" scans on the big business tables.
create index if not exists idx_companies_live on companies (id) where deleted_at is null;
create index if not exists idx_projects_live on projects (id) where deleted_at is null;
create index if not exists idx_quotations_live on quotations (id) where deleted_at is null;
create index if not exists idx_installments_live on installment_invoices (id) where deleted_at is null;
create index if not exists idx_payslips_live on payslips (id) where deleted_at is null;

-- Exactly one default bank account among live rows.
create unique index if not exists uq_bank_accounts_default
  on bank_accounts ((is_default)) where is_default = true;

-- ── Lookup uniqueness (data quality + idempotent seeding) ───────────────────
create unique index if not exists uq_cashflow_categories_system
  on cashflow_categories (system_key) where system_key is not null;
create unique index if not exists uq_authorities_label on authorities (label);
create unique index if not exists uq_document_types_label on document_types (label);
create unique index if not exists uq_positions_label on positions (label);
create unique index if not exists uq_employment_statuses_label on employment_statuses (label);
create unique index if not exists uq_salary_components_label on salary_components (label);
create unique index if not exists uq_bank_accounts_label on bank_accounts (label);
create unique index if not exists uq_milestone_templates_name on milestone_templates (name);
create unique index if not exists uq_legal_bases_label on legal_bases (label);
create unique index if not exists uq_admin_areas_label on admin_areas (label);

-- ── Pengiriman Dokumen ───────────────────────────────────────────────────────
create index if not exists idx_deliveries_quotation on document_deliveries (quotation_id);
create index if not exists idx_deliveries_installment on document_deliveries (installment_invoice_id);
create index if not exists idx_deliveries_payslip on document_deliveries (payslip_id);
create index if not exists idx_deliveries_status on document_deliveries (status);
create index if not exists idx_deliveries_created_by on document_deliveries (created_by);
