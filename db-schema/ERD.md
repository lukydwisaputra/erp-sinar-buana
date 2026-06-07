# Sinar Buana ERP — Database Diagram

Human-readable diagrams of the schema in [`src/schema/`](src/schema). Mermaid
renders automatically on GitHub and most Markdown viewers (VS Code: install
"Markdown Preview Mermaid Support").

- [1. Business flow](#1-business-flow-lifecycle--automation) — the lifecycle & automation
- [2. Master data & configuration](#2-master-data--configuration)
- [3. Quotation & Project](#3-quotation-sph--project)
- [4. Financial core](#4-financial-core-billing--payroll--cashflow--tax) — billing, payroll, cashflow, tax
- [5. Identity & cross-cutting](#5-identity--cross-cutting)
- [Legend](#legend)

---

## 1. Business flow (lifecycle & automation)

How a deal moves through the system and which automations fire (Postgres
triggers). Money is split into service / VAT / withholding at each step.

```mermaid
flowchart TD
    SPH["📄 Quotation (SPH)<br/>Draft → Leads → Deal"]
    PRJ["📁 Project<br/>milestones · Gantt · assignees"]
    MI["🧾 Master Invoice<br/>Total Biaya + term scheme"]
    INV["🧾 Installment Invoice (Termin)<br/>DPP · PPN · PPh23 snapshot"]
    PAY["💼 Payslip<br/>gross → net (take-home)"]
    CF[("💰 Cash Flow<br/>Kredit / Debit")]
    TAX["🏛️ Tax Center<br/>liabilities & credits"]

    SPH -- "Convert–Deal" --> PRJ
    SPH -- "Convert–Deal" --> MI
    SPH -. "activity schedule → milestones/Gantt" .-> PRJ
    PRJ --> MI
    MI --> INV
    PRJ -. "milestone triggers termin" .-> INV

    INV == "status → LUNAS" ==> CF
    INV == "status → LUNAS" ==> TAX
    PAY == "status → DIBAYAR" ==> CF
    PAY == "status → DIBAYAR" ==> TAX
    TAX == "Sudah Disetor (liability)" ==> CF

    subgraph AUTO["⚙️ On invoice LUNAS (locked entries)"]
      direction LR
      A1["+ Service income → kategori Faktur"]
      A2["+ Output VAT (titipan) → Pajak"]
      A3["− PPh23 withheld → Pajak"]
    end
    INV -.-> AUTO
```

---

## 2. Master data & configuration

The configurable core (PRD Bab 9): dropdowns, workflow statuses, tariffs and
templates are **data**, edited by the client — not hard-coded.

```mermaid
erDiagram
    company_profile {
        bool singleton PK
        text legal_name
        text npwp
        bool is_pkp "drives PPN collection"
    }
    tax_settings {
        bool singleton PK
        numeric ppn_rate "12"
        int ppn_dpp_numerator "11"
        int ppn_dpp_denominator "12"
        numeric pph23_rate "2"
        int invoice_due_days
        enum corp_tax_method "final_0_5|badan_22"
        numeric corp_tax_rate "0.5 or 22"
        numeric umkm_threshold "4.8B/year"
    }
    dashboard_settings {
        bool singleton PK
        numeric project_margin_threshold "e.g. 0.8"
        int forecast_horizon_days "default 90"
        int stalled_project_days "no-activity alert"
    }
    numbering_settings {
        bool singleton PK
        text sph_format "SPH/{seq}/{month}.{year}"
        text inv_format "INV/{seq}/{month}.{year}"
    }
    document_number_sequences {
        uuid id PK
        enum doc_type "SPH|INV"
        smallint year
        smallint month
        int last_number "reset monthly"
    }
    workflow_statuses {
        uuid id PK
        enum entity "penawaran|proyek|faktur|penggajian|milestone"
        text label "client-renamable"
        enum system_role "SELESAI|LUNAS|DIBAYAR|BATAL"
    }
    cashflow_categories {
        uuid id PK
        text label
        enum system_key "FAKTUR|PENGGAJIAN|PAJAK|BPJS|BONUS"
        enum expense_nature "HPP|OPERASIONAL|NON_LABA_RUGI"
        bool is_system "locked"
    }
    message_templates {
        uuid id PK
        enum channel "email|whatsapp"
        enum document_type "sph|invoice|slip_gaji"
    }
    bank_accounts {
        uuid id PK
        text bank_name
        text account_number
        bool is_default
    }

    companies {
        uuid id PK
        text name
        text npwp
        uuid admin_area_id FK
    }
    company_contacts {
        uuid id PK
        uuid company_id FK
        text name
        text phone
    }
    service_catalog {
        uuid id PK
        text name
        uuid document_type_id FK
        uuid authority_id FK
        uuid legal_basis_id FK
        uuid milestone_template_id FK
        numeric standard_price
        bool is_recurring "Laporan Semester"
    }
    employees {
        uuid id PK
        text name
        uuid position_id FK
        uuid employment_status_id FK
        numeric base_salary
        text npwp
    }
    milestone_templates {
        uuid id PK
        text name
    }
    milestone_template_steps {
        uuid id PK
        uuid template_id FK
        text name
        bool triggers_term
    }
    employee_salary_components {
        uuid id PK
        uuid employee_id FK
        uuid salary_component_id FK
    }

    document_types     ||--o{ service_catalog : classifies
    authorities        ||--o{ service_catalog : kewenangan
    legal_bases        ||--o{ service_catalog : dasar_hukum
    milestone_templates ||--o{ service_catalog : default_steps
    milestone_templates ||--o{ milestone_template_steps : has
    admin_areas        ||--o{ companies : located_in
    companies          ||--o{ company_contacts : has_PIC
    positions          ||--o{ employees : holds
    employment_statuses ||--o{ employees : status
    employees          ||--o{ employee_salary_components : default_components
    salary_components   ||--o{ employee_salary_components : applied
```

---

## 3. Quotation (SPH) & Project

The SPH carries line items, a proposed term scheme, internal RAB (margin) and an
activity schedule that becomes the project's milestones & weekly Gantt.

```mermaid
erDiagram
    quotations {
        uuid id PK
        text number "SPH/001/5.2026"
        date date
        uuid company_id FK
        uuid contact_id FK
        uuid status_id FK
        numeric total_amount "Total Penawaran"
    }
    quotation_items {
        uuid id PK
        uuid quotation_id FK
        uuid service_id FK
        numeric unit_price
        numeric line_total
    }
    quotation_term_scheme {
        uuid id PK
        uuid quotation_id FK
        text label
        numeric percentage
    }
    quotation_rab_personnel {
        uuid id PK
        uuid quotation_id FK
        text role
        numeric amount "Jumlah A"
    }
    quotation_rab_direct_costs {
        uuid id PK
        uuid quotation_id FK
        numeric amount "Jumlah B"
    }
    activity_schedules {
        uuid id PK
        uuid quotation_id FK
        uuid project_id FK
        smallint num_months "not locked to 3"
        smallint weeks_per_month
    }
    activity_schedule_rows {
        uuid id PK
        uuid schedule_id FK
        text activity_name
        uuid milestone_id FK
    }
    activity_schedule_marked_weeks {
        uuid id PK
        uuid row_id FK
        smallint week_number
        int is_actual "0=plan 1=actual"
    }
    projects {
        uuid id PK
        text name
        uuid company_id FK
        uuid status_id FK
        uuid quotation_id FK
        numeric contract_value "= Total Penawaran"
        smallint recurring_period "semester 1|2"
    }
    project_services {
        uuid id PK
        uuid project_id FK
        uuid service_id FK
    }
    project_assignees {
        uuid id PK
        uuid project_id FK
        uuid employee_id FK
        enum role "ketua_tim|anggota|doc_controller"
    }
    milestones {
        uuid id PK
        uuid project_id FK
        uuid assignee_employee_id FK
        uuid status_id FK
        date target_date
        date actual_date
        bool triggers_term
        uuid linked_master_invoice_id FK
    }
    project_comments {
        uuid id PK
        uuid project_id FK
        uuid author_id FK
        text body
    }
    comment_mentions {
        uuid id PK
        uuid comment_id FK
        uuid mentioned_user_id FK
    }
    project_status_log {
        uuid id PK
        uuid project_id FK
        uuid from_status_id FK
        uuid to_status_id FK
    }

    quotations ||--o{ quotation_items : has
    quotations ||--o{ quotation_term_scheme : proposes
    quotations ||--o{ quotation_rab_personnel : rab_A
    quotations ||--o{ quotation_rab_direct_costs : rab_B
    quotations ||--o| projects : "Deal → creates"
    quotations ||--o{ activity_schedules : drafted_in
    projects   ||--o{ activity_schedules : gantt
    activity_schedules ||--o{ activity_schedule_rows : rows
    activity_schedule_rows ||--o{ activity_schedule_marked_weeks : weeks
    milestones ||--o{ activity_schedule_rows : visualized_as
    projects   ||--o{ project_services : contains
    projects   ||--o{ project_assignees : assigned
    projects   ||--o{ milestones : has
    projects   ||--o{ project_comments : feed
    projects   ||--o{ project_status_log : history
    project_comments ||--o{ comment_mentions : mentions
```

---

## 4. Financial core (billing → payroll → cashflow → tax)

The accounting heart. Installment tax columns are stored snapshots (round
half-up). Auto cashflow/tax rows are `is_locked` and follow their source.

```mermaid
erDiagram
    master_invoices {
        uuid id PK
        uuid project_id FK
        uuid company_id FK
        numeric total_cost "Total Biaya"
        uuid status_id FK "Belum Lunas|Lunas"
    }
    master_invoice_services {
        uuid id PK
        uuid master_invoice_id FK
        uuid service_id FK
    }
    master_invoice_terms {
        uuid id PK
        uuid master_invoice_id FK
        text label
        numeric percentage
    }
    installment_invoices {
        uuid id PK
        text number "INV/002/05.2026"
        uuid master_invoice_id FK
        uuid term_id FK
        date due_date "editable"
        numeric current_term_value "nilai termin"
        numeric dpp "value x 11/12"
        numeric ppn "12% x DPP"
        numeric pph23 "2% x value"
        numeric total_after_tax
        numeric net_income "value - PPh23"
        uuid bank_account_id FK
        uuid status_id FK "Lunas|Belum"
    }
    payslips {
        uuid id PK
        text number
        uuid employee_id FK
        date period_start
        date period_end
        numeric base_effective "base x multiplier"
        numeric pph21_amount "manual, 0 valid"
        numeric gross_pay
        numeric net_pay "take-home"
        uuid status_id FK "Dibayar|Menunggu"
    }
    payslip_components {
        uuid id PK
        uuid payslip_id FK
        uuid salary_component_id FK
        enum kind "tunjangan|potongan"
        numeric amount
        bool is_employer_portion
    }
    cashflow_entries {
        uuid id PK
        enum type "kredit|debit"
        date date
        numeric amount
        uuid category_id FK
        enum source "manual|faktur|penggajian|pajak"
        enum tax_component "jasa|ppn|pph23|pph21|bpjs|bonus"
        bool is_locked
        bool is_cancelled
        uuid installment_invoice_id FK
        uuid payslip_id FK
        uuid tax_entry_id FK
        uuid project_id FK "optional: realisasi RAB link"
    }
    rab_actuals {
        uuid id PK "Realisasi RAB"
        uuid project_id FK
        enum rab_category "personil_A|langsung_B"
        numeric amount
        date date
        text note
        uuid cashflow_entry_id FK "optional"
    }
    tax_entries {
        uuid id PK
        enum tax_type "ppn_keluaran|ppn_masukan|pph23|pph21|bpjs"
        enum nature "kewajiban|kredit"
        date tax_period "masa pajak"
        numeric amount
        date due_date
        enum settlement_status "belum|terlambat|sudah"
        text ntpn
        bool bukti_potong_received
        uuid installment_invoice_id FK
        uuid payslip_id FK
        uuid company_id FK
        uuid employee_id FK
    }

    master_invoices ||--o{ master_invoice_services : bills
    master_invoices ||--o{ master_invoice_terms : scheme
    master_invoices ||--o{ installment_invoices : generates
    master_invoice_terms ||--o{ installment_invoices : per_term
    installment_invoices ||--o{ cashflow_entries : "LUNAS → 3 entries"
    installment_invoices ||--o{ tax_entries : "PPN + PPh23"
    payslips ||--o{ payslip_components : lines
    payslips ||--o{ cashflow_entries : "DIBAYAR → net pay"
    payslips ||--o{ tax_entries : "PPh21 + BPJS"
    tax_entries ||--o{ cashflow_entries : "Disetor → expense"
    cashflow_categories ||--o{ cashflow_entries : classifies
    projects ||--o{ rab_actuals : "actual cost (HPP)"
    cashflow_entries ||--o| rab_actuals : "optional link"
```

> **Dashboard profitability (computed, no aggregate tables):** the P&L waterfall (Revenue
> ex-PPN → COGS = `rab_actuals` → Gross → Opex via `cashflow_categories.expense_nature` →
> Operating/before-tax → corporate tax via `tax_settings` → Net/after-tax), per-project
> margin (plan RAB vs `rab_actuals`), cash forecast + runway, and the action center are all
> derived **real-time** from the entities above. PPh 23 is a credit/asset — **not** subtracted
> from P&L revenue. See planning specs Bab 8 & 10.4/10.8.

---

## 5. Identity & cross-cutting

Auth, audit, notifications and attachments wrap the whole system.

```mermaid
erDiagram
    auth_users {
        uuid id PK "Supabase Auth"
        text email
    }
    user_profiles {
        uuid id PK,FK "= auth.users.id"
        text full_name
        enum role "admin|keuangan|sales|tim_teknis|viewer"
        uuid employee_id FK "1:1, unique"
        bool is_active
    }
    employees {
        uuid id PK
        text name
    }
    audit_log {
        uuid id PK
        text table_name
        uuid record_id
        enum action "insert|update|delete|restore|hard_delete"
        uuid actor_id FK
        jsonb old_data
        jsonb new_data
    }
    notifications {
        uuid id PK
        uuid user_id FK
        enum type "tax_due|invoice_due|mention|semester_report|term_ready"
        bool is_read
        timestamptz scheduled_for
    }
    attachments {
        uuid id PK
        text file_url "Supabase Storage"
        uuid uploaded_by FK
        uuid comment_id FK
        uuid tax_entry_id FK
        uuid installment_invoice_id FK
        uuid payslip_id FK
    }

    auth_users    ||--|| user_profiles : extends
    employees     ||--o| user_profiles : "has login (1:1)"
    user_profiles ||--o{ audit_log : acted
    user_profiles ||--o{ notifications : receives
    user_profiles ||--o{ attachments : uploaded
```

---

## Legend

| Symbol | Meaning |
| --- | --- |
| `||--o{` | one-to-many (parent → children) |
| `||--o|` | one-to-(zero-or-)one |
| `||--||` | one-to-one |
| `PK` / `FK` | primary key / foreign key |
| `==>` (flow) | trigger-driven automation |
| `-.->` (flow) | suggested / optional link |
| 🔒 locked | auto cashflow/tax rows immune to manual edit (`is_locked`) |

> Diagrams show **representative** columns for readability — every table, column,
> index, trigger and RLS policy lives in [`src/schema/`](src/schema) and
> [`sql/`](sql). Tax math, numbering and the automations above are verified
> end-to-end (see the validation notes in [README.md](README.md)).
