# Sinar Buana ERP — Design System

The single source of truth for the ERP's look-and-feel. Visual language follows **Supabase**
(brand green `#3ECF8E` on a neutral charcoal/gray scale), with full **light + dark** support.
Built to drop straight into the future Next.js app (App Router · Tailwind · shadcn/ui ·
next-themes — see [../architecture.md](../architecture.md) §3).

> The *backend* dropped Supabase (architecture.md §1); here we borrow only its **visual** style.

## What's here

| File | What it is |
| --- | --- |
| [ui-ux-guidelines.md](./ui-ux-guidelines.md) | **UI foundations** — design goals, colour strategy (60-30-10), typography, visual hierarchy, spacing/elevation/layout, theming |
| [components.md](./components.md) | **Component patterns** mapped to shadcn/ui (app shell, KPI cards, data tables, status badges, detail drawer, buttons, forms, states) |
| [ux-frameworks.md](./ux-frameworks.md) | **UX practice** — Enterprise-UX lens, HEART, UXR, LIFT, CORE, UX SWOT, stakeholder mapping, audit checklist |
| [tokens/colors.md](./tokens/colors.md) | Every color in **OKLCH** (+ hex ref), light/dark, semantic status, and the **WCAG contrast** table |
| [tokens/globals.css](./tokens/globals.css) | Drop-in shadcn CSS variables in OKLCH (`:root` + `.dark`) + base styles |
| [tokens/tailwind-theme.ts](./tokens/tailwind-theme.ts) | Tailwind `theme.extend` mapping the variables to utility classes |
| [tokens/fonts.ts](./tokens/fonts.ts) | `next/font` setup — **Inter** (UI) + **Source Code Pro** (money/IDs) |
| [preview.html](./preview.html) | **Open in a browser** to see the palette, type, badges, table & shell in both modes |

## Quick start

**See it now:** open `preview.html` in any browser and click *Toggle light / dark*. No build needed.

**Wire it into the app** (once `apps/web` — or wherever the app lives — is scaffolded):

1. Copy `tokens/globals.css` → the app's global stylesheet (e.g. `src/app/globals.css`).
2. Merge `tokens/tailwind-theme.ts` into `tailwind.config.ts` (`darkMode: "class"`, `theme.extend`).
3. Import `fontSans` / `fontMono` from `tokens/fonts.ts` in the root layout; add their `.variable`
   classes to `<html lang="id">` and `font-sans` to `<body>`.
4. Run `npx shadcn init` and accept — the token shape already matches; add components as needed.
5. Wrap the app in `next-themes` `<ThemeProvider attribute="class">`.

These tokens are **copy-in-place**, not a rewrite — `npx shadcn init` produces a near-identical shape.

## Non-negotiables

- **Tokens only** — every color is a token referenced as `var(--token)` (OKLCH); no raw hex or
  `oklch()` literals in components.
- **OKLCH, tinted neutrals, no pure `#fff`/`#000`** — greys carry a faint green tint so they read
  *made*, not synthetic. Details in [tokens/colors.md](./tokens/colors.md).
- **Brand green is a fill/accent, not body text** on light surfaces (fails WCAG AA as small text).
  Use `brand-deep #006239` for green *text*.
- **One saturated accent** — green only, used like a highlighter (≤~5% of any screen); one primary
  action per view.
- **Status = colour + text + icon**, never colour alone. **Icons = Lucide only.**
- **All 8 interaction states** on every interactive component (incl. loading/error/success).
- **No AI-slop tells** — no gradients/fake chrome/invented numbers/emoji icons/eyebrows. See
  [ui-ux-guidelines.md §7](./ui-ux-guidelines.md).
- **Money** is mono, right-aligned, tabular.
- Every screen renders correctly in **both** themes (AA-verified, 7:1 body target).
- UI copy/labels are **Bahasa Indonesia** (PRD NFR Bab 13); these docs are in English.
