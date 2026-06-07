# UX Practice — Research & Audit Frameworks

> The "how we evaluate experience" side of the system, mirroring the attached UX cheat-sheet
> cards. Every framework here is grounded in **one concrete ERP example** so it isn't abstract.
> Pairs with the visual rules in [ui-ux-guidelines.md](./ui-ux-guidelines.md).

---

## 0 · Our lens: Enterprise UX (not B2B/marketing)

The ERP is built for **internal staff**, not external customers — that changes the goalposts.

| | **This ERP (Enterprise UX)** | (contrast: B2B/customer UX) |
| --- | --- | --- |
| Built for | Internal users — fixed staff roster | External clients |
| Aims to | **Optimize workflows & save time** | Reduce churn, grow engagement |
| Tailored for | Specific roles (admin, finance, sales) | Wider range of customers |
| Use cases | **Highly specialized** (quotation → billing → cashflow) | Broad |
| Success measured by | **Time saved & error reduction** | Satisfaction & retention |
| Research methods | **Task analysis, staff interviews, shadowing** | Surveys, competitive analysis |

**So our north-star metrics are lagging operational ones:** time-on-task, data-entry error rate,
clicks-to-complete, and rework. We measure whether the *work* got faster, not whether users "liked" it.

---

## 1 · HEART — experience quality

| | Meaning | ERP example | What we'd track |
| --- | --- | --- | --- |
| **H**appiness | User satisfaction | Staff feel confident the invoice numbers are right | Pulse survey / qualitative |
| **E**ngagement | Active, healthy usage | Daily use of the cashflow dashboard | DAU on key modules |
| **A**doption | Uptake of features | New installment-billing flow actually used | % using new vs. old path |
| **R**etention | Users keep coming back | Finance returns to the reminder queue weekly | Repeat task completion |
| **T**ask success | Completing the job | Quotation → approved SPH without rework | Completion & error rate |

Pick **one HEART signal per feature** to design and measure against — don't track all five for everything.

---

## 2 · UXR — break a problem to its root

**Understand → eXamine → Recommend.**

- **Understand** what's happening. *Eg:* staff abandon the installment-billing form at step 3.
- **eXamine** why. *Eg:* the form asks for tax data they don't have at that moment.
- **Recommend** the fix. *Eg:* defer the tax field, allow "save as draft," prefill from the project.

Use UXR for any reported friction before jumping to a redesign.

---

## 3 · LIFT — friction in a flow/conversion

Six levers to inspect on any multi-step task (e.g. **creating an invoice**):

| Lever | Question | ERP failure smell |
| --- | --- | --- |
| **Value proposition** | Is the payoff of finishing clear? | Unclear why this step matters |
| **Relevance** | Does the screen match the user's intent? | Fields that don't apply to this client |
| **Clarity** | Is it easy to understand/act? | Ambiguous labels, no IDR formatting |
| **Anxiety** | Anything creating hesitation? | "Will this send an email to the client now?" |
| **Distraction** | Anything pulling them away? | Too many secondary buttons competing |
| **Urgency** | Is there a reason to act now? | Overdue items not surfaced |

Two **positive** levers (value, urgency) to strengthen; four **negative** (relevance, clarity,
anxiety, distraction) to remove.

---

## 4 · CORE — fast practical evaluation

**Context → Obstacles → Resolution → Evaluation.**

- **Context** — the real scenario. *Eg:* finance closing the month on a tablet, in a hurry.
- **Obstacles** — friction points. *Eg:* overdue tax entries are buried; reminders are manual.
- **Resolution** — the fix. *Eg:* `pg_cron` auto-flags overdue; a reminder queue surfaces them.
- **Evaluation** — measure after. *Eg:* manual reminder time dropped; fewer missed due dates.

CORE is the lightweight loop for a single screen when HEART/UXR is overkill.

---

## 5 · UX SWOT lens

A quick experience audit before a redesign:

| | |
| --- | --- |
| **Strengths** — where the flow already builds trust/clarity (e.g. clear numbering, audit trail) | **Weaknesses** — where usability breaks (e.g. dense forms, manual steps) |
| **Opportunities** — accessibility, automation, smoother flows (e.g. auto-overdue, presigned uploads) | **Threats** — staff working around the tool in spreadsheets; data drifting out of the ERP |

---

## 6 · Stakeholder mapping (UX context)

Plot each stakeholder on **influence × interest**; tailor involvement:

- **High influence / high interest** — *collaborate deeply* (e.g. finance lead): workshops, prototype reviews.
- **High influence / low interest** — *keep reassured* (e.g. owner): high-level impact updates only.
- **Low influence / high interest** — *keep engaged* (e.g. daily operators): share findings, gather feedback.
- **Low influence / low interest** — *minimal updates* at milestones.

Bring high/high stakeholders into usability reviews so the solution stays aligned to real work.

---

## 7 · Five-step UX problem-solving model

1. **Define the challenge** — turn a business issue into a user-centered problem statement.
2. **Gather evidence** — analytics, task observation, staff interviews; find where struggles happen.
3. **Uncover insights** — analyze the journey to pinpoint friction and bottlenecks.
4. **Design & test** — prototype, validate with the actual staff, iterate quickly.
5. **Sustain & improve** — watch the operational KPIs and keep refining from real use.

---

## 8 · 7 elements of UX alignment

Keep design, product, and engineering pointed the same way:

| Element | For this ERP |
| --- | --- |
| **Strategy** | UX goals map to operational outcomes (time saved, fewer errors) |
| **Structure** | How design/product/dev coordinate on each module |
| **Systems** | These guidelines + tokens + shadcn as the shared toolkit |
| **Style** | Calm, dense, Supabase-flavored; one accent |
| **Staff** | Who designs, builds, and operates each area |
| **Skills** | Journey mapping, accessibility, data-table design |
| **Shared values** | Design for operator success *and* data integrity |

---

## Audit checklist (run before shipping a module)

- [ ] **Start clean** — review with fresh eyes; drop assumptions.
- [ ] **Watch real staff** use it (don't guide them); note where they hesitate or error.
- [ ] **Review every touchpoint** — entry, nav, the core flow, CTAs, microcopy (Bahasa Indonesia), a11y.
- [ ] **Uncover hidden needs** — "what did you expect here? what confused you?"
- [ ] **Make issues measurable** — task-success rate, time-on-task, error rate, drop-off step.
- [ ] **Recommend clear next steps** with expected outcomes; assign owners and timelines.
- [ ] **Continuous mindset** — small improvements each cycle; auditing is ongoing, not a one-off.
