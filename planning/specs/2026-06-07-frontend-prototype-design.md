# Frontend Prototype — Design System + Clickable Mock Walkthrough

> **Date:** 2026-06-07
> **Status:** Design approved (brainstorming) — pending implementation plan
> **Scope:** A read-only, mock-data frontend prototype of the full SBMJ ERP, built to show the client.
> **Builds on:** [architecture.md](../../docs/architecture.md) (tech stack), [design system](../../docs/design/README.md) (tokens + component patterns), [user stories EP-00…EP-10](../user-stories/README.md).

---

## 1. Goal

Produce a **clickable prototype** the client can walk through, covering **all 11 modules** at a shallow depth (list / detail / form per area). The prototype is **read-only** — realistic seeded data, forms fully rendered but non-persisting.

It is built **spec-driven, in granular baby steps** — one screen or one component per step — so the work is easy to track and any problem is caught at the step it appears, not at the end.

Two outcomes, in order:

1. **Design-system pass (Phase 0):** rebuild the design system in **shadcn/ui + Tailwind** as a live component library with a showcase page, so missing components are discovered **before** screens are built.
2. **Prototype pass (Phases 1–2):** the app shell + every module's screens, wired to a typed mock-data layer.

## 2. Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Scope | **All 11 modules, shallow** | Client sees the whole product surface |
| Mock data | **Typed fixtures behind a mock data-access layer** (Zod-validated, TanStack Query shape) | Screens survive the swap to the real backend — only the layer's internals change |
| Interactivity | **Read-only walkthrough** | Forms render and navigate; submit → "Demo: tidak disimpan" toast; no persistence/state machine |
| RBAC | **Skipped entirely** | Pure design walkthrough; no role switcher, no permission gating. (Real enforcement is server-side, later.) |
| Unit of work | **Baby step** = one screen or one component | Tight tracking; review per step; fix before moving on |
| App location | **Standard Next.js** (`create-next-app` defaults at repo root: `src/app`, `src/components`, `src/lib`) | No `apps/web` nesting; `planning/` `docs/` `db-schema/` `infra/` stay siblings |
| Build order | **Design system → Foundation → Screens** | Components must exist and the shell must run before screens |

## 3. Tech & structure

Per [architecture.md §3](../../docs/architecture.md): TypeScript · Next.js (App Router) · shadcn/ui + Tailwind · TanStack Query · React Hook Form + Zod · TanStack Table · Motion · next-themes · date-fns · Lucide icons. (No backend, auth, MinIO, or worker in the prototype.)

```
ERP/                         (repo root — Next.js app lives here)
  src/
    app/                     App Router routes; one folder per area
      design-system/         the component showcase (Phase 0 deliverable)
      login/  …  dasbor/     module routes (Phase 2)
    components/
      ui/                    shadcn primitives (themed with our tokens)
      shared/                composite patterns (app shell, KPI card, data table, drawer…)
    lib/
      data/                  THE MOCK LAYER — one file per module (listPenawaran(), getFaktur()…)
      fixtures/              seeded realistic data (Bahasa Indonesia, IDR, SBMJ-like)
      schemas/               Zod schemas (shared shape with the future backend)
      query/                 TanStack Query hooks (usePenawaranList()…) calling lib/data
  planning/ docs/ db-schema/ infra/   (unchanged siblings)
```

**Design tokens** are copied in per the [design README quick-start](../../docs/design/README.md): `tokens/globals.css` → `src/app/globals.css`; `tokens/tailwind-theme.ts` merged into `tailwind.config.ts` (`darkMode: "class"`); `tokens/fonts.ts` imported in the root layout; wrapped in `next-themes`.

### The mock layer (the spine)

Each module exposes async functions matching the **future API contract**:

```ts
// src/lib/data/penawaran.ts
export async function listPenawaran(params?): Promise<Penawaran[]>   // fixtures, Zod-parsed
export async function getPenawaran(id: string): Promise<Penawaran | null>
```

- A small `delay()` simulates latency so loading skeletons show.
- **Read-only:** mutating functions are stubs that no-op and fire a "Demo: tidak disimpan" toast — forms stay navigable without faking persistence.
- TanStack Query hooks in `lib/query/` wrap these, so swapping to real `fetch` later touches only `lib/data/`.

## 4. Conventions (every step must satisfy)

Per the [design non-negotiables](../../docs/design/README.md) and [components.md](../../docs/design/components.md):

- Renders correctly in **both light and dark** themes.
- **Tokens only** — every color is `var(--token)`; no raw hex.
- **All 8 interaction states** on every interactive component.
- Status = **color + text + icon** (Lucide only), never color alone.
- **Money** is mono, tabular, right-aligned, IDR `Rp 1.000.000` (no decimals).
- UI copy/labels in **Bahasa Indonesia**; realistic SBMJ-like seeded data (no invented-looking numbers).
- Built from a **shadcn primitive** where one exists (not hand-rolled).
- No AI-slop tells (no card-in-card, fake chrome, gradients, emoji icons).

## 5. Baby-step backlog (the master tracker)

Ordered. Each step is one buildable, reviewable unit. After each, the user eyeballs the running result before the next begins. During execution this list becomes a live todo list.

### Phase 0 — Design System (`/design-system` showcase)

Every primitive is the **official shadcn registry item** (`npx shadcn add <name>`), themed with our tokens — never hand-rolled where a registry item exists. Verified against the live `@shadcn` registry (2026-06-07). Steps are grouped by category for tracking; build top-to-bottom.

**A · Foundation**
| ID | Step | shadcn items |
|---|---|---|
| `DS-01` | Tokens + Tailwind theme wired; light/dark toggle working | (tokens) |

**B · Form & inputs**
| ID | Step | shadcn items |
|---|---|---|
| `DS-02` | Button (8 states, all variants) + button group | `button`, `button-group` |
| `DS-03` | Input + input group (search icon, `Rp` prefix, inline button/spinner) | `input`, `input-group` |
| `DS-04` | Textarea + Label | `textarea`, `label` |
| `DS-05` | Field layout + Form (RHF + Zod resolver) + validation pattern | `field`, `form` |
| `DS-06` | Select + native select | `select`, `native-select` |
| `DS-07` | Combobox (single + multi) | `combobox`, `command`, `popover` |
| `DS-08` | Checkbox / Radio-group / Switch | `checkbox`, `radio-group`, `switch` |
| `DS-09` | Date picker (calendar + popover) | `calendar`, `popover` |
| `DS-10` | Date range picker (two-month + presets: bulan ini / kuartal / tahun) | `calendar`, `popover` |
| `DS-11` | Input-OTP (invite activation / set-password) | `input-otp` |
| `DS-12` | Money input + **Terbilang** (composite on input group) | `input-group` |
| `DS-13` | File upload / dropzone (mock — drag-drop + file list + states) | (composite) |

**C · Data display**
| ID | Step | shadcn items |
|---|---|---|
| `DS-14` | Card | `card` |
| `DS-15` | KPI / stat card (composite on card) | `card` |
| `DS-16` | Data table (TanStack: sort/filter/toolbar/row-actions/states) | `table` |
| `DS-17` | Pagination (page nav + page-size) | `pagination` |
| `DS-18` | Badge / status set (success/warning/destructive/info) | `badge` |
| `DS-19` | Avatar (+ avatar stack) | `avatar` |
| `DS-20` | Progress (bar + indeterminate; project/termin completion) | `progress` |
| `DS-21` | Item — list-row primitive (action-center feed, settings rows) | `item` |
| `DS-22` | Charts — line / bar / donut / area (adapt `chart-*` blocks) | `chart` |
| `DS-23` | Separator (horizontal + vertical) | `separator` |
| `DS-24` | Aspect-ratio frames (PDF preview, logos) | `aspect-ratio` |

**D · Overlays**
| ID | Step | shadcn items |
|---|---|---|
| `DS-25` | Dialog | `dialog` |
| `DS-26` | Alert-dialog (confirm) | `alert-dialog` |
| `DS-27` | Sheet / detail drawer + timeline | `sheet` |
| `DS-28` | Dropdown menu | `dropdown-menu` |
| `DS-29` | Tooltip / Popover | `tooltip`, `popover` |
| `DS-30` | Hover card (company/PIC summary, employee preview) | `hover-card` |
| `DS-31` | Command palette (⌘K) + Kbd | `command`, `kbd` |

**E · Feedback & states**
| ID | Step | shadcn items |
|---|---|---|
| `DS-32` | Alert (inline banner — info/warning/success/destructive) | `alert` |
| `DS-33` | Toast (sonner) | `sonner` |
| `DS-34` | Skeleton + Spinner | `skeleton`, `spinner` |
| `DS-35` | Empty state (icon + message + CTA; reused on every list) | `empty` |
| `DS-36` | Error / retry block | (composite) |

**F · Disclosure & navigation**
| ID | Step | shadcn items |
|---|---|---|
| `DS-37` | Tabs | `tabs` |
| `DS-38` | Accordion / Collapsible | `accordion`, `collapsible` |
| `DS-39` | Toggle / Toggle-group (view switchers, filter toggles) | `toggle`, `toggle-group` |
| `DS-40` | Breadcrumb | `breadcrumb` |
| `DS-41` | Scroll-area | `scroll-area` |

**G · Showcase**
| ID | Step | shadcn items |
|---|---|---|
| `DS-42` | **Showcase page** assembling all of the above, both themes → **REVIEW: spot missing components** | — |

> The `sidebar` primitive (adapting block `sidebar-07`, collapses to an icon rail) is installed here but **composed in `F-02`**, not the showcase.
>
> Module-specific composites are built when their screen needs them (or promoted into Phase 0 if the `DS-42` review demands): line-item editor, termin-scheme editor, RAB table, tax-breakdown panel (DPP/PPN/PPh), termin progress stepper, Gantt / milestone timeline, status board, payslip layout, P&L waterfall, runway gauge, action-center feed item (on `item`), send-document modal, document-status tracker, PDF preview frame (on `aspect-ratio`), NTPN entry, numbering-format editor, workflow-status editor.

### Phase 1 — App Foundation

| ID | Step |
|---|---|
| `F-01` | Next.js scaffold + routing skeleton + root layout (fonts, theme provider) |
| `F-02` | **Sidebar** (nav groups, active state, collapsible rail) |
| `F-03` | **Top bar** (breadcrumb, theme toggle, user menu) |
| `F-04` | App shell layout (compose F-02 + F-03 + content slot) |
| `F-05` | Mock-data layer + fixtures pattern (one worked end-to-end example wired through TanStack Query) |

### Phase 2 — Screens (one screen per step)

Built in dependency order so each demo builds on the last.

**Auth (EP-01)**
`AUTH-01` Login · `AUTH-02` Set-password (invite activation) · `AUTH-03` Forgot/reset password

**User management (EP-01)**
`UM-01` User list · `UM-02` User detail · `UM-03` Create/edit user (invite) form

**Master Data (EP-02)**
`MD-01` Company list · `MD-02` Company detail (+ PIC) · `MD-03` Company form (nested PIC) ·
`MD-04` Service catalog list · `MD-05` Catalog item detail · `MD-06` Catalog item form ·
`MD-07` Employee list · `MD-08` Employee detail · `MD-09` Employee form ·
`MD-10` Company profile

**Penawaran / SPH (EP-03)**
`SPH-01` SPH list · `SPH-02` SPH detail (line items, termin, RAB, terbilang, status) ·
`SPH-03` SPH create/edit (line-item editor, termin scheme, RAB, estimasi jadwal) · `SPH-04` SPH PDF preview

**Manajemen Proyek (EP-04)**
`PRJ-01` Project list · `PRJ-02` Project detail (milestones, assignees, progress) ·
`PRJ-03` Project / milestone form · `PRJ-04` Gantt / timeline view

**Faktur & Termin (EP-05)**
`FKT-01` Faktur induk list · `FKT-02` Faktur induk detail (termin breakdown) ·
`FKT-03` Invoice termin detail (DPP/PPN/PPh breakdown) · `FKT-04` Generate invoice termin form · `FKT-05` Invoice PDF preview

**Penggajian (EP-06)**
`GAJI-01` Payroll run list · `GAJI-02` Payroll run detail · `GAJI-03` Payslip view · `GAJI-04` Generate payroll run form

**Arus Kas (EP-07)**
`KAS-01` Cashflow ledger list · `KAS-02` Entry detail · `KAS-03` Entry form · `KAS-04` Cashflow summary (charts)

**Tax Center (EP-08)**
`TAX-01` Tax obligations list · `TAX-02` Tax entry detail (NTPN, attachments) · `TAX-03` Setor/deposit form · `TAX-04` Tax summary

**Dasbor (EP-09)**
`DASH-01` Owner command center (KPIs, P&L waterfall, runway, action center) · `DASH-02` Finance dashboard ·
`DASH-03` Sales dashboard · `DASH-04` Project/technical dashboard

**Pengiriman Dokumen (EP-10)**
`DOC-01` Send-document flow (email/WA modal) · `DOC-02` Document delivery status/log

**Config (EP-00)**
`CFG-01` Settings landing · `CFG-02` Numbering-format editor · `CFG-03` Tax-rates config ·
`CFG-04` Workflow-status editor · `CFG-05` Categories · `CFG-06` Templates (PDF/email) · `CFG-07` Email/SMTP settings

## 6. Per-step done criteria

A step passes its review gate when it:

- renders correctly in **both themes**, tokens only;
- uses **realistic Bahasa-Indonesia / IDR** seeded data;
- matches the relevant user story's intended screen/flow;
- is reachable through the app shell and navigates (list → detail → form where applicable);
- forms submit to the "Demo: tidak disimpan" toast (no persistence);
- carries the 8 interaction states on interactive elements.

## 7. Out of scope (this prototype)

Real backend / API / database · authentication & sessions · RBAC enforcement · real persistence or mutations · MinIO/file storage · background jobs/email · PDF generation (preview is a styled frame, not a real render) · tests beyond what's needed to keep the app running · production deployment.

## 8. Review workflow

```
Spec (this doc) → implementation plan (writing-plans) → execute step-by-step
For each baby step:  build → user eyeballs running result → go / fix → next
DS-25 and end of each phase are explicit REVIEW gates.
```
