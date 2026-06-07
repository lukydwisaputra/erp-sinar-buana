# Component Patterns

> How the [foundations](./ui-ux-guidelines.md) become real components, mapped to **shadcn/ui**.
> Patterns are derived from the reference dashboards (sidebar + KPI cards + finance table) and the
> order-detail drawer. Every color is a token — see [tokens/colors.md](./tokens/colors.md).

Install only what a screen needs (`npx shadcn add <component>`); don't pull the whole library.

---

## App shell

**Sidebar** (shadcn `sidebar`) — recessed surface (`bg-sidebar`, darker than canvas in dark mode,
matching the reference). Grouped sections (e.g. *Workforce*, *Finance*, *Administration*) with
caption-case group labels. Active item = `bg-sidebar-accent` fill + green text/icon + 600 weight
(no left stripe — the fill carries selection); inactive = `text-sidebar-foreground`. Collapsible
to an icon rail for tablet/focus.

**Top bar** — breadcrumb (left), global actions + **theme toggle** + user menu (right). Sticky.

---

## KPI / stat card

shadcn `card`. Layout: caption-case label → large value (`display`/`h1`, mono if it's money) →
optional delta line. Use sparingly; 3–4 across the top of a page.

```
┌──────────────────────────┐
│ TOTAL INVOICED        ⤢  │  ← caption + optional action icon
│ Rp 1.45 M                │  ← mono, tabular, largest element
│ ▲ 8% vs last month       │  ← success/destructive color + arrow + text
└──────────────────────────┘
```
Delta color is the *only* status color on the card; the value itself stays `foreground`.

---

## Data table (TanStack Table)

The workhorse of an ERP. shadcn `table` + TanStack Table for sorting/filtering/pagination.

- **Columns:** text left-aligned; **amounts/quantities right-aligned, mono, tabular** (`td.amount`).
- **Header:** caption-case, `muted-foreground`, sortable affordance on hover.
- **Rows:** hairline `border` dividers; hover = `bg-muted/50`; generous vertical padding (`12px`)
  so dense data stays scannable.
- **Status cell:** a **badge** (below), never bare colored text.
- **Row actions:** trailing `⋮` menu (shadcn `dropdown-menu`); destructive items in `destructive`.
- **States:** loading = `skeleton` rows; empty = centered empty state (below); error = inline retry.
- **Toolbar:** filter chips + status dropdown above the table (see "Status: All" in the reference).

---

## Status badge

shadcn `badge`, `variant` per status. Pattern = **subtle background + solid-color text + dot/icon**
(color + text + icon = the signal-pairing rule). Maps to the finance lifecycle:

| Label | Token | Light bg / text | Dark bg / text |
| --- | --- | --- | --- |
| **Paid** | `success` | `#E7F8F0` / `#006239` | `#15301F` / `#3ECF8E` |
| **Pending** | `warning` | `#FEF3DA` / `#B45309` | `#332408` / `#F59E0B` |
| **Overdue** | `destructive` | `#FDE9E9` / `#C2363B` | `#3A1717` / `#FF6B6B` |
| **Draft / In progress** | `info` | `#E7ECFC` / `#2E44A0` | `#181F33` / `#6E8BFF` |

> All pairs above are WCAG-AA-verified. Never use brand `#3ECF8E` or solid `#24B47E` as the
> "Paid" *text* in light mode — both fail; the light "Paid" text is `brand-deep #006239`.

---

## Detail drawer + timeline

Right-side sheet (shadcn `sheet`) for inspecting a record without leaving the list — matches the
order-detail reference. Structure:

1. **Header** — record number (mono, e.g. `#012345/10`), subtitle, close `✕`.
2. **Meta row** — created-at, payment badge, status badge.
3. **Customer block** — name, email (link `primary`), phone; inline edit pencil.
4. **Timeline** — vertical, newest first: completed steps = green check, in-progress = spinner,
   each with actor + timestamp. This is the audit trail made visible.
5. **Items / line items** — thumbnail, name + meta, qty, amount (mono, right-aligned).

Strongest elevation on the page (overlay surface + scrim). Esc / scrim-click closes.

---

## Buttons

shadcn `button`. One **primary** per view.

| Variant | Use | Token |
| --- | --- | --- |
| **primary** | The single key action (Save, Create, Pay) | `bg-primary text-primary-foreground` |
| **secondary** | Supporting action | `bg-secondary` |
| **ghost** | Low-emphasis / toolbar | transparent + `hover:bg-muted` |
| **outline** | Neutral bordered | `border` + transparent |
| **destructive** | Delete/void — always behind a confirm dialog | `bg-destructive` |

Sizes `sm / default / lg`; icon buttons are square. Disabled = `opacity-50`, no hover. Focus shows
the `ring`.

> Hard delete is forbidden (architecture.md / BR-13) — "delete" actions **deactivate/void**;
> label them honestly and confirm via `alert-dialog`.

---

## Forms

shadcn `form` + **React Hook Form + Zod** (schemas shared with the backend per architecture.md §3).

- Label **above** input (proximity); `14px`; required marked with text, not color alone.
- One column on tablet, two on desktop; group related fields with a section header + divider.
- Inline validation on blur; error text in `destructive` below the field + red `ring`.
- Money/number inputs use the mono face + tabular figures; show the IDR prefix.
- Primary submit bottom-right; `secondary` cancel beside it.

---

## Empty / loading / error states

- **Empty** — icon + one-line explanation + a primary CTA ("Buat invoice pertama"). Never a blank table.
- **Loading** — `skeleton` matching the final layout (not a spinner) so the page doesn't jump.
- **Error** — inline panel with the message + a retry button; never a dead end.

---

## Interaction — the 8 states (mandatory)

Every interactive component ships **all eight** states, not just the happy path. A button or input
with only default + hover is half-built.

| State | Token / treatment |
| --- | --- |
| **default** | base token surface/text |
| **hover** | one signal only — a colour shift *or* 1px translate, via `--ease-out` |
| **focus-visible** | `ring` (brand green), **rendered instantly** — never transition the ring |
| **active** | slight `translateY(1px)` or darker fill |
| **disabled** | `opacity-50`, `cursor: not-allowed`, no hover |
| **loading** | spinner/skeleton + `aria-busy`; min visible 300ms (don't flash) |
| **error** | `destructive` ring + message below (forms); honest copy |
| **success** | **silent** — show the saved result, not a celebratory toast |

Touch parity: every hover affordance also works on focus/tap (no hover-only menus or delete buttons).

## Icons

**Lucide only** (shadcn default) — one library, one stroke voice. 16–20px, `1.5px` stroke,
`currentColor`. Never mix icon sets or use emoji as icons. See [ui-ux-guidelines.md §9](./ui-ux-guidelines.md).

## Motion (Motion / `framer-motion`)

Subtle and fast. Drawer/sheet slide ~`200ms` `--ease-out`; dropdowns/popovers fade+scale; table
rows don't animate on data change. Animate `transform`/`opacity` only; **animation never delays
input**; focus rings are instant. Respect `prefers-reduced-motion` → ≤150ms crossfade. Full rules:
[ui-ux-guidelines.md §8](./ui-ux-guidelines.md).

---

### Component checklist
- [ ] Built from a shadcn primitive (not hand-rolled) where one exists.
- [ ] All colors are tokens (`var(--token)`); renders in light **and** dark.
- [ ] **All 8 interaction states** present and consistent.
- [ ] Status shown as color **+** text **+** icon; icons are Lucide.
- [ ] Keyboard-operable; focus ring visible and instant.
- [ ] Money is mono + tabular + right-aligned.
- [ ] No anti-slop tell (no card-in-card, fake chrome, invented numbers, emoji icons).
