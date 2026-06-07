# Color Tokens

> Source of truth for every color in the Sinar Buana ERP. Visual language follows
> **Supabase** (brand green + neutral charcoal/gray scale). All app colors must come from
> these tokens — **no hardcoded hex in components.**

Tokens are expressed in **OKLCH** — perceptually uniform, so equal lightness steps *look*
equal and the green hue stays consistent across every tint (HSL/RGB lie about brightness).
The variable holds the **full** colour, consumed as `var(--token)` (Tailwind v4 / current
shadcn), **not** `hsl(var(--token))`. Hex values below are approximate sRGB references only.

**Neutrals are not flat grey.** Every neutral carries a faint green tint (chroma ≈ 0.005–0.008
at hue 156) so the greys read *made*, not synthetic — and there is **no pure `#fff` / `#000`**
(paper ≈ 99.4% L, ink ≈ 20.5% L). See [`globals.css`](./globals.css) for the copy-in `:root`
/ `.dark` block and [`tailwind-theme.ts`](./tailwind-theme.ts) for the Tailwind mapping.

---

## 1. Brand (Supabase green)

| Name | OKLCH | Hex ≈ | Use |
| --- | --- | --- | --- |
| `brand` / primary | `oklch(76.2% 0.154 159)` | `#3ECF8E` | Primary CTA, active nav, focus ring, key accents |
| `brand-hover` | `oklch(68.4% 0.142 162)` | `#24B47E` | Hover/pressed for primary, success fills |
| `brand-deep` | `oklch(43.7% 0.104 157)` | `#006239` | High-contrast green text, icons on light surfaces |
| `brand-contrast` (on-green) | `oklch(26.6% 0.063 153)` | `#052E16` | Text/icon placed **on** a green fill |

> **One accent, used like a highlighter.** Brand green is the *only* saturated hue in the
> system (status colors aside). Keep it to active nav, focus rings, link/CTA emphasis, and the
> single primary button per view — roughly **≤5% of any screen**. Supabase fills its primary
> button with green, and so do we; everything larger stays neutral. If green is spreading, that's
> the slop defaulting — pull it back. See [ui-ux-guidelines.md §2](../ui-ux-guidelines.md).

> ⚠️ **Accessibility rule (load-bearing):** `#3ECF8E` as text on white = **2.0:1 → fails WCAG
> AA.** Brand green is for **fills, accents, active states, focus rings, and large (≥24px/700)
> headings only.** Note the solid `#24B47E` *also* fails as small text on light (2.4:1), so for
> **any green text on a light surface** (a "Paid" label, a positive KPI delta) use `brand-deep`
> `#006239` (6.8–7.5:1 ✓). On dark surfaces `#3ECF8E` text passes (8.5:1 on `#1C1C1C`).

---

## 2. Neutral scale (canvas → text)

All neutrals share hue **156** with a faint chroma — elevation in dark mode comes from a
*lighter* surface (rising lightness), never a heavier shadow.

### Dark theme
| Role | OKLCH |
| --- | --- |
| canvas / background | `oklch(21.0% 0.006 156)` |
| sidebar (recessed) | `oklch(18.0% 0.006 156)` |
| surface / card / popover | `oklch(25.5% 0.006 156)` |
| secondary / muted | `oklch(28.0% 0.006 156)` |
| accent / overlay | `oklch(30.0% 0.006 156)` |
| border | `oklch(30.0% 0.008 156)` |
| input / border-strong | `oklch(36.5% 0.008 156)` |
| text | `oklch(94.5% 0.004 156)` |
| text-muted | `oklch(70.5% 0.005 156)` |

### Light theme
| Role | OKLCH |
| --- | --- |
| canvas / background / card | `oklch(99.4% 0.003 156)` |
| sidebar (recessed) | `oklch(98.2% 0.004 156)` |
| secondary / muted / accent | `oklch(96.8% 0.005 156)` |
| border / input | `oklch(91.5% 0.006 156)` |
| text | `oklch(20.5% 0.010 156)` |
| text-muted | `oklch(51.5% 0.006 156)` |

---

## 3. Semantic status (ERP finance: Paid / Pending / Overdue)

Each status has a **solid** form (fills — e.g. the `--success` token used as a chart/fill color)
and a **badge** form (subtle background + a darker text color tuned for AA). The badge text is
**not** always the solid value — on light surfaces greens/reds must darken to clear 4.5:1.

| Status | Solid (fill) | Badge bg (light / dark) | Badge text (light / dark) | AA |
| --- | --- | --- | --- | --- |
| success — *Paid / Active* | `#24B47E` | `#E7F8F0` / `#15301F` | `#006239` / `#3ECF8E` | 6.8 / 7.1 ✓ |
| warning — *Pending / Due soon* | `#F59E0B` | `#FEF3DA` / `#332408` | `#B45309` / `#F59E0B` | 4.6 / 7.0 ✓ |
| destructive — *Overdue / Failed* | `#E5484D` | `#FDE9E9` / `#3A1717` | `#C2363B` / `#FF6B6B` | 4.6 / 5.8 ✓ |
| info — *Draft / In progress* | `#3E63DD` | `#E7ECFC` / `#181F33` | `#2E44A0` / `#6E8BFF` | 7.3 / 5.3 ✓ |

> The subtle/text pairs above are all WCAG-AA-verified (§6). Never use brand `#3ECF8E` or solid
> `#24B47E` as "Paid" text in light mode — both fail; use `#006239`.

---

## 4. Chart palette

| Token | OKLCH | Hex ≈ |
| --- | --- | --- |
| `--chart-1` | `oklch(76.2% 0.154 159)` | `#3ECF8E` |
| `--chart-2` | `oklch(54.4% 0.191 267)` | `#3E63DD` |
| `--chart-3` | `oklch(76.9% 0.165 70)` | `#F59E0B` |
| `--chart-4` | `oklch(62.7% 0.233 304)` | `#A855F7` |
| `--chart-5` | `oklch(62.6% 0.193 23)` | `#E5484D` |

---

## 5. shadcn token map (quick reference)

| Token | Light | Dark |
| --- | --- | --- |
| `--background` | `oklch(99.4% 0.003 156)` | `oklch(21.0% 0.006 156)` |
| `--foreground` | `oklch(20.5% 0.010 156)` | `oklch(94.5% 0.004 156)` |
| `--card` | `oklch(99.4% 0.003 156)` | `oklch(25.5% 0.006 156)` |
| `--popover` | `oklch(99.4% 0.003 156)` | `oklch(25.5% 0.006 156)` |
| `--primary` | `oklch(76.2% 0.154 159)` | `oklch(76.2% 0.154 159)` |
| `--primary-foreground` | `oklch(26.6% 0.063 153)` | `oklch(26.6% 0.063 153)` |
| `--secondary` / `--muted` | `oklch(96.8% 0.005 156)` | `oklch(28.0% 0.006 156)` |
| `--muted-foreground` | `oklch(51.5% 0.006 156)` | `oklch(70.5% 0.005 156)` |
| `--accent` | `oklch(96.8% 0.005 156)` | `oklch(30.0% 0.006 156)` |
| `--destructive` | `oklch(62.6% 0.193 23)` | `oklch(62.6% 0.193 23)` |
| `--success` | `oklch(68.4% 0.142 162)` | `oklch(76.2% 0.154 159)` |
| `--warning` | `oklch(76.9% 0.165 70)` | `oklch(76.9% 0.165 70)` |
| `--info` | `oklch(54.4% 0.191 267)` | `oklch(54.4% 0.191 267)` |
| `--border` | `oklch(91.5% 0.006 156)` | `oklch(30.0% 0.008 156)` |
| `--input` | `oklch(91.5% 0.006 156)` | `oklch(36.5% 0.008 156)` |
| `--ring` | `oklch(76.2% 0.154 159)` | `oklch(76.2% 0.154 159)` |
| `--sidebar` | `oklch(98.2% 0.004 156)` | `oklch(18.0% 0.006 156)` |
| `--sidebar-foreground` | `oklch(43.5% 0.006 156)` | `oklch(80.0% 0.005 156)` |
| `--sidebar-accent` | `oklch(95.0% 0.006 156)` | `oklch(28.0% 0.006 156)` |
| `--sidebar-border` | `oklch(91.5% 0.006 156)` | `oklch(28.0% 0.006 156)` |

> Full `*-foreground` pairs and the status tokens live in [`globals.css`](./globals.css) — this
> table is the at-a-glance subset.

---

## 6. Verified contrast pairs (WCAG)

Targets (hallmark `color.md`): **body text 4.5:1 minimum, 7:1 target**; large text & UI
boundaries 3:1. The OKLCH neutrals preserve the lightness of the hex references below (the green
tint is imperceptible to contrast), so these ratios hold. Verify new pairs with the browser
devtools vision-deficiency emulator before shipping.

| Pair | Theme | Ratio | Verdict |
| --- | --- | --- | --- |
| `text` `#171717` on `background` `#FFFFFF` | light | 18.1:1 | ✓ AAA |
| `text-muted` `#707070` on `#FFFFFF` | light | 4.7:1 | ✓ AA |
| `text` `#EDEDED` on `background` `#1C1C1C` | dark | 14.4:1 | ✓ AAA |
| `text-muted` `#A0A0A0` on `#1C1C1C` | dark | 6.5:1 | ✓ AA |
| brand `#3ECF8E` text on `#FFFFFF` | light | 2.0:1 | ✗ → fills/large only |
| solid `#24B47E` text on `#FFFFFF` | light | 2.4:1 | ✗ → use brand-deep |
| `brand-deep` `#006239` text on `#FFFFFF` | light | 7.5:1 | ✓ AAA |
| brand `#3ECF8E` text on `#1C1C1C` | dark | 8.5:1 | ✓ AAA |
| `brand-contrast` `#052E16` on brand fill `#3ECF8E` | both | 6.3:1 | ✓ AA |
