# UI Guidelines — Foundations

> The visual foundation for the Sinar Buana ERP. Aesthetic follows **Supabase** (brand green
> on a neutral charcoal/gray scale), shipped as the tokens in [`tokens/`](./tokens/).
> Structured as scannable cards — read top-to-bottom or jump to a section.
> Companion docs: [components.md](./components.md) · [ux-frameworks.md](./ux-frameworks.md).

---

## 1 · Design Goals

*What "good" means for this product. The ERP is an **internal, data-dense finance tool** —
optimize for speed and trust, not marketing dazzle.*

| 🎨 Aesthetics | ⚙️ Functionality | 🎯 Purpose |
| --- | --- | --- |
| **Visual appeal** — Supabase palette, generous whitespace, one accent (green) | **Usability** — keyboard-first, predictable nav, dense tables that stay legible | **Operator efficiency** — fewer clicks from quotation → billing → cashflow |
| **Consistency** — every color/space/radius from a token; no one-off styles | **Responsiveness** — desktop & tablet (NFR Bab 13); tables degrade gracefully | **Trust in numbers** — money is unambiguous, aligned, never truncated |
| **Restraint** — green is 10% of the screen; neutrals carry the rest | **Clarity** — one primary action per view; destructive actions are guarded | **Auditability** — status, timestamps, and who-did-what are always visible |
| **Result:** calm, professional, "boring on purpose" | **Result:** staff finish tasks fast and rarely make data-entry errors | **Result:** the tool gets out of the way of the work |

**Anti-goals:** decorative gradients on data screens, more than one accent color, animation that
delays input, color as the *only* signal (always pair with text/icon).

---

## 2 · Colour Strategy

Adapted from the "Colour Logic → Colour Execution" model, applied to the Supabase palette.
Full values + WCAG table: [tokens/colors.md](./tokens/colors.md).

**Colour Logic (the why)**
- **Psychology** — green = confirmation/health/money-in; reserve it so it *means* something.
- **Palette** — one brand hue (`oklch(76% 0.154 159)` ≈ `#3ECF8E`) + a neutral ramp + four
  status hues. That's it. Colours are **OKLCH** (perceptually uniform); neutrals carry a faint
  green tint (hue 156, chroma ≈ 0.006) so the greys read *made*, not flat. **No pure `#fff`/`#000`.**
- **Contrast** — body text targets **7:1** (4.5:1 floor), large text/UI 3:1. Verified in colors.md §6.
- **Cultural** — IDR amounts, Indonesian labels; green/red carry the universal paid/overdue read.

**Colour Execution (the how) — the 60-30-10 rule**

| Share | Role | Tokens |
| --- | --- | --- |
| **60%** dominant | Canvas & surfaces — the quiet background everything sits on | `background`, `card`, `muted`, `sidebar` |
| **30%** secondary | Structure & text — borders, headings, body, icons | `foreground`, `muted-foreground`, `border` |
| **10%** accent | **Earn attention** — primary buttons, active nav, focus rings, key links | `primary` (brand green) |

> The "10%" budgets *all* visual emphasis (headings, structure, the active row). The **saturated
> green** within it is a highlighter, not a colour block — keep it to **≤5%** of any screen:
> active nav, focus rings, links, and the one primary button. If green is spreading past that,
> something non-primary is shouting — pull it back to a neutral. The dashboard reference works
> because green appears only on the active nav item, the primary CTA, and "Paid" — nowhere else.

**The accessibility rule, restated:** `#3ECF8E` is a **fill**, not body text. Green text on light
surfaces must use `brand-deep #006239` — the solid `#24B47E` also fails as small text on light
(2.4:1), so "Paid" labels in light mode use `#006239`. On dark surfaces, `#3ECF8E` text is fine
(8.5:1).

---

## 3 · Typography

Two open-source families (Supabase equivalents), wired in [tokens/fonts.ts](./tokens/fonts.ts).

- **Inter** — UI, body, headings. Neutral, legible at small sizes, great for dense tables.
- **Source Code Pro** — code, document numbers (`INV-2026-001`), and **all money/quantity
  columns** with `font-variant-numeric: tabular-nums` so digits align vertically.

**Type scale** (rem @ 16px base) — keep to these steps; don't invent in-betweens.

| Token | Size / line-height | Weight | Use |
| --- | --- | --- | --- |
| `display` | 30 / 36 | 700 | Page title (one per screen) |
| `h1` | 24 / 32 | 600 | Section / card-group header |
| `h2` | 20 / 28 | 600 | Card title, drawer title |
| `h3` | 16 / 24 | 600 | Sub-section, table group |
| `body` | 14 / 20 | 400 | Default text, table cells |
| `small` | 13 / 18 | 400 | Secondary / helper text |
| `caption` | 12 / 16 | 500 | Labels, badges, column headers (uppercase, tracked) |
| `mono` | 13–14 | 400–500 | Amounts, IDs, code |

**Rules:** max **two** weights per view (400 + 600). Body text is `14px` (data apps run denser
than marketing sites). Money is always mono + right-aligned + tabular. Never set paragraph text in
green or in all-caps.

---

## 4 · Visual Hierarchy

*Twelve levers that guide the eye. On a data screen, the goal is: the operator instantly knows
the one number that matters and the one action to take.*

| Principle | How we apply it |
| --- | --- |
| **Size & scale** | Page title `display`; KPI numbers large; everything else calm. Big = important. |
| **Spacing** | Whitespace groups and separates — see §5. Cramped tables get row padding, not smaller text. |
| **Colour & contrast** | Green only on the *one* primary action; status color only on the status cell. |
| **Typography hierarchy** | Weight + size, not color, ranks headings. Caption-case + tracking for labels. |
| **Proximity** | Related fields sit together (label above input); unrelated groups get a divider/gap. |
| **Alignment** | Everything snaps to the grid. Numbers right-align; text left-aligns; nothing centered in tables. |
| **Repetition** | Same card, badge, and button shapes everywhere — learn once, recognize everywhere. |
| **Leading lines** | Table rows, the sidebar rail, and drawer dividers carry the eye down a path. |
| **Negative space** | Don't fill every pixel; empty space signals "nothing to do here, move on." |
| **Rule of thirds / focal point** | KPI cards top, primary action top-right — where the eye lands first. |
| **Consistency of state** | Hover, focus, active, disabled look identical across all components. |
| **Signal pairing** | Status = color **+** text **+** icon, never color alone (colorblind-safe, audit-safe). |

---

## 5 · Spacing · Radius · Elevation · Layout

**Spacing — 4px base scale.** Use only these steps (Tailwind `1`=4px … `12`=48px):
`4 · 8 · 12 · 16 · 20 · 24 · 32 · 48`. Card padding `16–24`; section gaps `24–32`; form field
gap `16`; table cell padding `12` vertical / `16` horizontal.

**Radius** — from `--radius` (`0.5rem`): inputs/buttons `md`, cards/drawers `lg`, badges full/`sm`.
Consistent rounding reads as one product.

**Elevation** — in **dark mode, lift surfaces by getting lighter, not by heavy shadows** (canvas
`#1C1C1C` → card `#232323` → overlay/popover `#2A2A2A`). Shadows stay subtle. In light mode use a
soft shadow + a `border` hairline. Drawers/modals get the strongest elevation; cards the least.

**Layout** — desktop & tablet (NFR Bab 13):
- **App shell:** fixed left sidebar (collapsible to icons), top bar, scrollable content.
- **Content max-width** for forms/reading; tables go full-width.
- **Grid:** 12-col on desktop; KPI cards 4-up desktop / 2-up tablet; forms 2-col desktop / 1-col tablet.
- **Detail drawer** (right-side sheet) for record detail without leaving the list — see the order
  drawer reference in [components.md](./components.md).

---

## 6 · Theming (light / dark)

- **Mechanism:** `next-themes` with `attribute="class"` toggles `.dark` on `<html>`; every color
  comes from a CSS variable, so the *same* component renders both themes with zero conditional
  styling. No hardcoded hex anywhere.
- **Default & toggle:** respect OS preference on first load; expose a light/dark/system toggle in
  the top bar. Persisted by next-themes.
- **Contrast guarantee:** both themes are pre-verified to WCAG **AA** (colors.md §6). Any new
  color must be added as a token *and* contrast-checked before use.
- **Parity:** no feature is light-only or dark-only; screenshots in docs/PRs should show both.
- **`suppressHydrationWarning`** on `<html>` (next-themes sets the class pre-paint to avoid flash).

---

## 7 · Anti-slop — made, not generated

*An internal tool earns trust by looking deliberate. These are the named "AI tells" — patterns
every LLM reaches for by default. Ship none of them. (Drawn from the hallmark anti-pattern list,
scoped to a dashboard ERP.)*

**Banned outright**
- **Gradient anything** — no purple→blue/→pink hero gradients, no `background-clip:text` gradient
  headlines, no aurora-blob or floating-orb backgrounds. Solid surfaces; ink-coloured headings.
- **Pure `#000` / `#fff`** — use the tinted paper/ink tokens (§2).
- **Inter-everywhere with no pairing** — UI sans (Inter) is paired with the mono face for figures
  (§3). A one-font data screen is a template screen.
- **The 3-column icon-tile feature grid** (icon-in-a-coloured-square → 2-line heading → 3-line
  body, ×3, 24px gap). If you need feature blocks, vary widths/heights or drop the icons.
- **Card-in-card** — one containment layer. A KPI card does not live inside another bordered card.
- **Side-stripe / left-accent bars** — a thick coloured left border on a card *or* nav item. The
  active sidebar item is marked by a tinted `bg-sidebar-accent` fill + green text, **not** a stripe.
- **Generic emoji as icons** (✨🚀⚡🎯✅) and **mismatched icon sets** — see §9.
- **Invented numbers** — never fabricate a KPI, count, or "▲ 8%" to fill a slot. Use the real
  value, or a labelled `—` placeholder ("metric to confirm"). A fake number on a finance tool is
  a trust failure, and it's an unmistakable AI tell.
- **Re-drawn chrome** — no hand-built fake browser bars / phone frames / window dots around
  screenshots. Wrap a real screenshot in a `<figure>` with at most a hairline border.
- **Eyebrow on every section** — uppercase `01 · OVERVIEW` kickers, especially the tag-left /
  heading-right two-column head, are an editorial-SaaS tell. Rank sections with weight + size.
- **Straight quotes / `--` / `...`** in rendered copy — use `"…"` `—` `…`.

**Restraint defaults**
- **One accent.** Green only (status hues aside). No second brand colour creeping in.
- **Bias the layout.** Don't centre headline + body + button section after section; data screens
  are left-aligned to a grid anyway.
- **Cut motion before adding it** (§8). Most screens want *less*.

---

## 8 · Motion discipline

Minimal by default — this is a tool, not a showcase. The page should feel *composed*, not animated.

- **Three named easings only:** `--ease-out` (most UI), `--ease-in` (exits), `--ease-in-out`
  (moves). **Never** the browser default `ease`; **never** bounce/overshoot (`cubic-bezier(…1.56…)`)
  on UI state — overshoot is for genuine physical drag-release only.
- **Animate `transform` and `opacity` only** — never layout properties (width/height/top/left).
- **Durations:** micro-feedback 100–150ms; sheet/drawer/dropdown ~200ms. Keep it short.
- **Focus rings appear instantly** — never transition `outline`/`box-shadow` on focus, or keyboard
  users get no indicator at the start of the animation.
- **No `transition: all`** — name the properties. No universal `hover:scale-105`: pick *one* signal
  per element (a colour shift, a 1px translate, or an underline — not all of them).
- **No animate-on-scroll on everything.** Tables and rows don't fade in on data change. Pick at most
  one orchestrated entrance; the rest is just *there*.
- **`prefers-reduced-motion: reduce`** → spatial motion collapses to a ≤150ms opacity crossfade.
- Implemented via **Motion** (`motion`/framer-motion), already in the stack (architecture.md §3).

---

## 9 · Icons & microcopy

**Icons — one library, period.** Use **Lucide** (shadcn's default; consistent stroke voice).
Never mix Lucide with Heroicons/Material/emoji — icons are typography, and three stroke weights on
one screen is the icon-set tell. Default size 16–20px, `1.5px` stroke, `currentColor` so they
inherit text/state colour. Status icons pair with the badge (§ components): check, clock, alert.

**Microcopy (Bahasa Indonesia, per PRD NFR Bab 13)**
- Curly quotes, em-dashes, real ellipsis — never `"`, `--`, `...`.
- **Plausible placeholder/seed names**, not "Acme Corp" / "John Doe". Use domain-real Indonesian
  examples: *PT Sumber Rejeki*, *CV Mitra Abadi*, *Budi Santoso*, *Siti Rahayu*, *INV-2026-001*.
- Buttons are **verbs** — *Buat Invoice*, *Simpan*, *Kirim* — never a noun ("Invoice"). One-line,
  never wrapping to two.
- Errors say what happened **and** the next step; status is honest ("Jatuh tempo 3 hari lalu").

---

### Quick checklist before merging a screen
- [ ] Every color is a token (`grep` finds no raw hex / no `oklch(` literal in the diff).
- [ ] Exactly one primary (green) action in view; saturated green ≤ ~5% of pixels.
- [ ] Money is mono, right-aligned, tabular; nothing truncates.
- [ ] Status uses color **+** text **+** icon.
- [ ] No anti-slop tell from §7 (gradients, fake chrome, invented numbers, emoji icons, eyebrows).
- [ ] Motion: named easings, `transform`/`opacity` only, focus ring instant, reduced-motion handled.
- [ ] Icons are all Lucide; copy uses curly quotes + verb buttons + plausible ID names.
- [ ] Renders correctly in **both** light and dark.
- [ ] Tab/keyboard order is sane; focus ring (`ring`) is visible.
- [ ] Body text clears AA (7:1 target) in both themes.
