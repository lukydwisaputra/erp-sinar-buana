# Dashboard Expansion — Profitability, Cash Forecasting & Action Center

> **Date:** 2026-06-07
> **Status:** Design approved (brainstorming) — pending implementation plan
> **Extends:** [EP-09 Dasbor](../user-stories/09-dasbor.md), [PRD §8](../prd/08-dasbor.md)
> **Depends on:** [EP-04 Proyek](../user-stories/04-manajemen-proyek.md), [EP-05 Faktur Termin](../user-stories/05-faktur-termin.md), [EP-07 Arus Kas](../prd/07-arus-kas.md), [EP-08 Tax Center](../prd/10-penanganan-pajak.md), [SPH/RAB §4.3](../prd/prd.md)

---

## 1. Problem & Goal

### The gap
The current dashboard tracks **cash flow**, not **profit**. It shows Total Pemasukan / Pengeluaran / Saldo (cumulative + monthly), category pie charts, a cashflow table, project status counts, unbilled receivables, and a tax summary. All of it is **backward-looking** and **single-month**.

Critically, the system does **not** compute profit today:

| Existing term | Sounds like | Actually is |
|---|---|---|
| Pendapatan Kotor | Gross profit | Gross **revenue** (termin value, pre-tax) |
| Pendapatan Bersih | Net profit | Net **revenue** (termin − PPh 23; PPN excluded as titipan) |
| Estimasi Margin (SPH) | Project profit | *Planned* margin = Penawaran − RAB, computed once at quote time, never tracked to actuals |
| Saldo Per Bulan | Monthly profit | Net **cash** movement (distorted by payroll/tax-deposit timing) |

- **Gross profit** (Revenue − cost of delivery) → not computed
- **Net profit** (− opex − income tax) → not computed
- **Before vs after tax** → not applicable yet — there is no profit line
- The taxes modeled (PPN, PPh 23, PPh 21) are pass-through / credits / employee taxes; the company's own income tax (**PPh Badan**) — required for true "after tax" — is not modeled.

### Goal
Turn the dashboard into a decision tool that answers: *Are we profitable? Will we run out of cash? Which projects make or lose money? What needs my attention today?* — via an Owner **command center** plus slimmed, job-scoped **role dashboards**.

### Scope (this round)
**In:** Profitability (company P&L + per-project margin), cash forecasting + runway, project/team health + a consolidated action center.
**Out (parked):** Sales pipeline/funnel analytics, full AR aging buckets/DSO.

---

## 2. Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Overview shape | Owner **command center** + simplified **role-specific** dashboards | Matches "overview all activity" while keeping each role focused on its job desc |
| Cost capture | Manual **realisasi RAB per project** | Lightweight; no per-transaction tagging; Finance records actual cost against RAB lines periodically |
| Profit basis | **Accrual waterfall** | Not distorted by cash/tax timing; shows both before- and after-tax |
| Income tax (PPh Badan) | **Configurable** rate + basis (Final 0.5% of revenue vs 22% of profit) | Adapts as the company grows; PPh 23 credited against PPh Badan when 22% method chosen |

---

## 3. Architecture

The dashboard remains a **computation layer** that stores nothing of its own — it aggregates from existing modules in real time (per existing EP-09 §7). This round adds three engines.

```
[ Invoices ] [ RAB/Realisasi ] [ Cashflow ] [ Payroll ] [ Tax Center ] [ Projects/Milestones ]
        \________________\__________|__________/________________/________________/
                                    |
            ┌───────────────────────┼───────────────────────┐
      Profitability Engine     Forecast Engine          Alert Engine
      (accrual P&L + margin)  (projected cash+runway)  (needs-attention feed)
            └───────────────────────┼───────────────────────┘
                          Command Center + Role Dashboards
```

Each engine is an independently testable unit with a defined input (source records) and output (computed view model). Role dashboards render **filtered subsets** of the same engine outputs — no duplicated calculation logic.

---

## 4. Data Foundations (new captures)

Four additions enable everything above.

### 4.1 Realisasi RAB (keystone)
A new record type capturing **actual** project cost against the plan.
- Per project, tagged to a RAB line or category (**Personil A** / **Langsung B**).
- Fields: project ref, RAB line/category, actual amount (IDR), date, note, optional link to a source cashflow expense.
- Entered manually by Keuangan; periodic. Without this there is no real margin.

### 4.2 Expense nature flag (on cashflow categories)
Each cashflow category carries one classification, so the P&L can be split correctly:
- **COGS** — direct project delivery cost
- **Opex** — overhead (admin, office, utilities)
- **Non-P&L** — settlements & non-expenses: PPN deposits (titipan), PPh 23 (credit/asset), loan principal, etc.

Sensible defaults applied to existing categories; editable in Settings.

### 4.3 Revenue recognition point (on Invoice Termin)
- For the **P&L**: revenue recognized on **invoice issuance** (accrual), at **full service value (ex-PPN)**.
- **PPh 23 is NOT subtracted from P&L revenue** — it is a prepaid income-tax credit (asset), not a revenue reduction.
- The existing "Pendapatan Bersih = termin − PPh 23" remains valid for the **cashflow** lens. The two lenses coexist; they are never silently mixed.

### 4.4 Income tax config (Settings)
- Method: **PPh Final 0.5% of revenue** (PP 55/2022) OR **PPh Badan 22% of taxable profit**.
- Configurable rate + the Rp 4.8B/year threshold.
- When 22% method is selected, accumulated **PPh 23** credit is applied against PPh Badan.
- Feeds the "Net Profit (after tax)" line; the line is always labeled an **estimate**.

---

## 5. Engines

### 5.1 Profitability Engine — P&L waterfall
For any period (month / quarter / year / custom), accrual basis:

| Line | Source | Notes |
|---|---|---|
| **Revenue** | Invoice Termin issued in period (service value, ex-PPN) | accrual — at issuance |
| − **COGS (project cost)** | Realisasi RAB on delivered projects | Personil A + Langsung B actuals |
| **= Gross Profit** | | + **Gross Margin %** |
| − **Operating Expenses** | Cashflow categories flagged **Opex** | admin, office, overhead |
| **= Operating Profit** | | **"before tax"** |
| − **Income Tax (PPh Badan)** | Settings config; PPh 23 credited | labeled *estimate* |
| **= Net Profit** | | **"after tax"** + **Net Margin %** |

- Non-P&L items excluded via the expense-nature flag.
- Every line drills down to source records.
- A small **cash-reality note** sits alongside so accrual profit is not confused with bank balance.

### 5.2 Per-Project Profitability
One row per project — the number missing today:

| Field | Definition |
|---|---|
| Contract Value | Faktur Induk / Total Penawaran |
| Recognized Revenue | Invoiced termin to date (accrual) |
| RAB Plan (A+B) | Planned cost |
| Realisasi (actual) | Actual cost to date (from §4.1) |
| **Plan Margin** | Contract − RAB *(the existing Estimasi Margin, now tracked)* |
| **Actual Margin** | Recognized Revenue − Realisasi to date |
| % Budget Used | Realisasi ÷ RAB |
| Health | 🟢 on track · 🟡 margin slipping (actual < plan by threshold) · 🔴 over budget (realisasi > RAB) |

Margin threshold is configurable. Mid-period projects show "to date" + an at-completion forecast.

### 5.3 Forecast Engine — projected cash + runway
Rolling horizon (default 90 days, configurable):
- **Expected inflows:** upcoming termin due dates (invoice / milestone-triggered schedule).
- **Expected outflows:** recurring payroll + tax/BPJS deposits due (Tax Center due dates) + known scheduled expenses.
- **Projected cash line:** current balance ± cumulative net, week by week.
- **Runway:** "current cash covers payroll + fixed obligations for **N months**" — directly answers the survival question created by cash-basis tax-timing distortion.

### 5.4 Alert Engine — "Needs Attention" feed
One consolidated, prioritized list; each item links to its source + an action:
- Overdue invoices · invoices due soon (AR)
- Tax / BPJS due **H-3** or overdue *(reuses existing reminder rule, PRD §10.6)*
- **PPh 23 bukti potong** not yet collected → tax credit at risk
- Project **over budget** / margin below threshold
- Milestone **slipping** (actual date > target)
- **Stalled** project (no activity in N days)

---

## 6. Dashboard Surfaces

### 6.1 Owner Command Center (Admin / Director)
Single scannable page, ordered by urgency:

```
┌─ KPI strip ────────────────────────────────────────────────┐
│ Net Profit (MTD) · Net Margin% · Cash on Hand · Runway(mo)  │
│ Revenue (MTD) · Gross Margin% · AR Outstanding · Tax Due    │
├─ Needs Attention (Alert Engine) ───────────────────────────┤
│ prioritized action feed — click to source                   │
├─ P&L Waterfall ──────────────┬─ Projected Cash (90d) ───────┤
│ Revenue→Gross→Op→Net          │ inflow/outflow + runway line │
├─ Per-Project Profitability ──┴──────────────────────────────┤
│ table: plan vs actual margin · health flags                  │
├─ Trends ───────────────────────────────────────────────────┤
│ Revenue / Profit / Cash over months (MoM)                    │
└─────────────────────────────────────────────────────────────┘
```
Global **period filter** + **drilldown** everywhere (existing FR-09.6).

### 6.2 Role-specific dashboards (job-scoped)

| Role | Sees | Does NOT see |
|---|---|---|
| **Keuangan** | P&L, cash forecast + runway, AR, tax position, financial alerts | — (near-full finance) |
| **Sales** | Own quotes → projects, contract values, project status, own deal alerts | Company P&L, costs/margin, payroll, tax |
| **Tim Teknis** | Assigned projects: milestone/schedule health, workload, delivery alerts | All financials (revenue, cost, margin, profit, tax) |
| **Viewer** | Read-only high-level project status + (optional) public KPIs | Costs, margins, profit, payroll, detailed finance |

Each is a filtered subset of the same engines; panels without permission simply do not render.

---

## 7. RBAC

Extends the existing matrix (EP-09 §3), enforced **server-side** ([GC-12](../user-stories/11-konvensi-global-nfr.md)).

New permission flags: `view_profit`, `view_project_cost`, `view_forecast`, `view_tax_detail`.

| Permission | Admin | Keuangan | Sales | Tim Teknis | Viewer |
|---|:-:|:-:|:-:|:-:|:-:|
| view_profit | ✓ | ✓ | ✗ | ✗ | ✗ |
| view_project_cost | ✓ | ✓ | ✗ | ✗ | ✗ |
| view_forecast | ✓ | ✓ | ✗ | ✗ | ✗ |
| view_tax_detail | ✓ | ✓ | ✗ | ✗ | ✗ |

---

## 8. Edge Cases

- **Empty states** (no data) render as empty, never errors — per existing spec.
- **No realisasi RAB yet** → per-project shows *plan margin only*; actual = "not recorded"; health = grey (not red).
- **Income tax line** always labeled *estimate*; depends on Settings method/threshold.
- **Accrual vs cash** difference is surfaced explicitly, never silently mixed.
- **Mid-period projects** → margin "to date" + at-completion forecast.
- **Non-PKP company** → no PPN lines (consistent with PRD §10.6); P&L unaffected.
- **Period with revenue but no cost recorded** → flagged so margin is not misread as 100%.

---

## 9. Open Items for Implementation Plan
- Exact recurring-payroll source for forecast outflows (fixed schedule vs last-period actuals).
- Where realisasi RAB entry lives in the UI (Project detail vs Cashflow vs dedicated screen).
- Default expense-nature mapping for each existing cashflow category.
- "Stalled project" inactivity window (N days) default + config location.
