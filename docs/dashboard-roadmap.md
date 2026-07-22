# Dashboard Roadmap

**Last updated:** 2026-06-20

---

## Phase 0 — Audit ✅ COMPLETE
Full codebase audit. No code changes. Findings documented in `project-status.md`.

---

## Phase 1 — Foundation (Pre-Claims)
**Status:** NOT STARTED — awaiting user approval

Tasks:
- [ ] Remove `Banner.tsx` from Home page (decorative/playful)
- [ ] Add print CSS to `globals.css` (required for all PDF exports)
- [ ] Create `src/lib/claims.ts` (all Claims types + helper functions)
- [ ] Create `src/app/api/claims/route.ts` (dedicated Claims API)

---

## Phase 2 — Claims Dashboard + Daily Case Tracker
**Status:** NOT STARTED

**Module: Claims Dashboard** (`/claims`)
- Today's case summary (live count)
- Cases per hour stat
- Active to-do count
- Quick-add buttons for all modules
- Recent accomplishments strip
- Weekly transfer count

**Module: Daily Case Tracker** (`/claims/cases`)
- Date picker (defaults to today)
- Add case: case number + status (closed/transferred/pended) + notes
- Case list for selected date — editable, deletable
- Live metrics: total / closed / transferred / pended
- Time inputs: hours worked + downtime
- Calculated: active hours + cases per hour
- Print as PDF button

**HARD STOP after this phase. Wait for "continue".**

---

## Phase 3 — Transfer Log + Huddle Notes + Accomplishments
**Status:** NOT STARTED

**Module: HGS Tank Transfer Log** (`/claims/transfers`)
- Add transfer: name, date, case number, destination
- Week filter + search
- Editable/deletable rows
- Print as PDF (week report)

**Module: Team Huddle Notes** (`/claims/huddle`)
- Session list (Wednesday-focused)
- Add/edit session: multiple topics (header + paragraph)
- Raw transcript input → user cleans → formats into topics
- Print as PDF (formatted notes)

**Module: Accomplishments Tracker** (`/claims/accomplishments`)
- Add: title, description, date, category
- Category: Standard / Escalation / Project / Leadership / Process
- Weekly + yearly summaries
- Print as PDF

**HARD STOP after this phase. Wait for "continue".**

---

## Phase 4 — OOS + New Hire + Claims Todos
**Status:** NOT STARTED

**Module: Out-of-Scope Work** (`/claims/oos`)
- Add: description, type, date, time spent (optional)
- Types: Escalation Email / Coworker Assist / Supervisor Project / Special Assignment
- Filter by type + search

**Module: New Hire Case Review** (`/claims/new-hire`)
- Add: new hire name, case number, assistance provided, date, notes
- Filter by new hire
- Weekly report view + PDF

**Module: Claims To-Do List** (`/claims/todos`)
- Add: task, priority (low/med/high), source (manual/coworker/supervisor), due date
- Views: today / overdue / all
- Quick-add from any claims page

**HARD STOP after this phase. Wait for "continue".**

---

## Phase 5 — SOP Builder + Audit Tracker
**Status:** NOT STARTED

**Module: SOP Knowledge Builder** (`/claims/sop`)
- Add SOP: title, claim behavior, step-by-step instructions, when to use, common mistakes, simplified explanation, tags
- Tag-based search library
- Edit/delete
- Print as PDF

**Module: Audit Tracker** (`/claims/audits`)
- Add audit: date, case numbers, outcome (pass/fail/needs correction), notes, follow-up
- Yearly summaries
- Print as PDF

**HARD STOP after this phase. Wait for "continue".**

---

## Phase 6 — Automated Reporting (Cron Jobs)
**Status:** NOT STARTED

**Daily Case Report** — Every day at 6:00 PM ET
- Collects today's case tracker data
- Stores report record in database
- User can view + print from `/claims/reports`

**HGS Weekly Report** — Every Friday at 9:55 AM ET
- Collects current week's transfers
- Stores report record
- Supervisor-ready PDF layout

**New Hire Weekly Report** — Every Friday at 10:00 AM ET
- Collects current week's new hire entries
- Groups by new hire name
- Stores report record

**Reports Viewer** (`/claims/reports`)
- List of all generated reports
- View any report formatted for printing
- Manual regeneration button

**HARD STOP after this phase. Wait for "continue".**

---

## Phase 7 — Yearly Archive + Navigation Polish
**Status:** NOT STARTED

- Year selector on all Claims modules
- Archive view: switch between 2026, 2027, etc.
- Full export (download as JSON)
- Update Sidebar, Header, CommandBar with all Claims links

---

## Recommended Next Session Prompt

```
Read /docs/project-status.md and /docs/dashboard-roadmap.md first.

We are on Phase 1 of the Claims Work Operating System build.

Phase 0 (audit) is complete.

Please begin Phase 1:
1. Remove the Banner.tsx decorative component from the Home page (src/app/page.tsx) — it is a Harry Potter-themed banner and is not appropriate for a professional work system.
2. Add print CSS styles to src/app/globals.css for PDF export support.
3. Create src/lib/claims.ts with all Claims types and helper functions.
4. Create src/app/api/claims/route.ts as a dedicated Claims data API.

After Phase 1 is complete, STOP and wait for my instruction to continue to Phase 2.
```

---

## Architecture Decisions Made

1. **Claims data namespace:** `data.claims` key in the existing JSONB — no new tables needed
2. **Claims API:** Dedicated `/api/claims` route — reads/writes only `data.claims` key, does not touch other sections
3. **PDF export:** Browser `window.print()` with `@media print` CSS — no extra packages needed
4. **Cron reports:** Store structured report data in `data.claims.reports` — browser renders + prints
5. **Yearly data:** All time-series data uses `{ [year]: { ... } }` structure for natural archiving
6. **No auth change:** Still single user "default" — this is a personal tool
