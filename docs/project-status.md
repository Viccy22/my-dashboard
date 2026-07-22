# Project Status

**Last updated:** 2026-06-20  
**Session:** Phase 0 — Audit Complete  
**Status:** Awaiting user approval to begin Phase 1

---

## What Was Completed This Session

- Full codebase audit (Phase 0)
- Corrected user role context: Victoria is NOT a call center rep. She works on a back-office team that receives cases sent by call center agents. No phone work.
- Created `/docs/` directory
- Wrote `project-status.md` and `dashboard-roadmap.md`

## What Was NOT Started

- Claims Work Operating System (all 14 modules)
- UI cleanup / aesthetic reset
- Any code changes whatsoever

## Files Created This Session

- `docs/project-status.md` (this file)
- `docs/dashboard-roadmap.md`

## Files Modified This Session

- None

---

## Existing Codebase State (Audit Findings)

### Architecture
- **Framework:** Next.js 14 App Router, TypeScript, Tailwind CSS
- **Database:** Neon Postgres (serverless) — single table `user_data`, one row per user
- **Storage pattern:** All app data stored as a single JSONB blob under `data.{key}` per section
- **Auth:** None — single hardcoded user `"default"`
- **Deployment:** Vercel
- **Blob storage:** `@vercel/blob` package installed but minimally used (dog photo upload only)

### Database Schema
```sql
CREATE TABLE user_data (
  id TEXT PRIMARY KEY,          -- always "default"
  data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)
```

### Existing Data Keys in JSONB
```
data.todos           → Todo[]
data.events          → CalEvent[]
data.maintenance     → MaintenanceData
data.finances        → { currentBalance, items: RecurringItem[] }
data.dogs            → { dogs: Dog[] }
data.lists           → { shopping: ListItem[], errands: ListItem[] }
data.health          → { skincare: SkincareEntry[] }
data.magic           → { games: MagicGame[] }
data.festivals       → { festivals: Festival[] }
data.vacations       → { trips: Trip[] }
data.school          → { assignments: Assignment[] }
data.running         → { runs: Run[] }
data.contacts        → { contacts: Contact[] }
data.holidays        → { holidays: HolidayItem[] }
```
**Claims will use:** `data.claims → ClaimsData`

### Existing Pages (19 total)
| Route | Page | Status |
|---|---|---|
| `/` | Home dashboard | Built |
| `/calendar` | Calendar | Built |
| `/contacts` | Contacts & Friends | Built |
| `/habits` | Habits | Built |
| `/garage` | Garage | Built |
| `/maintenance` | Home Maintenance | Built |
| `/measurements` | Measurements | Built |
| `/finances` | Bills & Budget | Built |
| `/subscriptions` | Subscriptions | Built |
| `/health` | Health & Wellness | Built |
| `/running` | Running | Built |
| `/school` | School | Built |
| `/dogs` | Dogs | Built |
| `/dogs/share/[dogId]` | Public dog share | Built |
| `/festivals` | Festivals | Built |
| `/vacations` | Vacations | Built |
| `/holidays` | Holidays | Built |
| `/magic` | Orlando Magic | Built |
| `/todos` | Tasks | Built |

### Existing Components
| File | Description | Keep/Change |
|---|---|---|
| `MobileShell.tsx` | Layout wrapper — sidebar + header + responsive drawer | KEEP |
| `Sidebar.tsx` | Left nav with grouped links (icons + labels) | MODERNIZE — add Claims group |
| `Header.tsx` | Topbar with page title + today's date | MODERNIZE — add Claims titles |
| `CommandBar.tsx` | Ctrl+K global search overlay | MODERNIZE — add Claims pages |
| `Banner.tsx` | Decorative Harry Potter night sky SVG | REMOVE — playful, not work-ready |

### Existing Lib Files
| File | Description |
|---|---|
| `src/lib/db.ts` | Neon connection + `ensureTable()` |
| `src/lib/finances.ts` | Finance types + helpers |
| `src/lib/maintenance.ts` | Maintenance types + helpers |

### Existing API Routes
| Route | Purpose |
|---|---|
| `GET/POST /api/data` | Load / save all user data (JSONB) |
| `POST /api/dogs/upload` | Dog photo upload to Vercel Blob |
| `GET /api/oura` | Oura ring health data |
| `GET /api/weather` | Weather widget data |

### Styling System
- **Design tokens** in `globals.css` using CSS variables
- **Dark theme:** near-black bg `#0c0c0e`, surface `#131316`
- **Accent:** indigo `#818cf8`
- **Status colors:** green, yellow, red
- **Standard classes:** `.card`, `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-icon`, `.row`, `.input`, `.checkbox`, `.toast`, `.empty`, `.divider`
- **Layout:** `.dash-grid`, `.dash-2col`, `.dash-main-aside`
- **Responsive breakpoint:** 768px — sidebar becomes slide-in drawer on mobile

### State Management Pattern (all pages use this)
```
Load: useEffect → fetch("/api/data") → set local state + rawDataRef
Save: mutation → update local state → save({ ...rawDataRef.current, key: updatedValue })
Status: idle → saving → saved (2s) → idle, or error
```

### Technical Debt
1. **Save conflict risk** — all pages write entire JSONB blob; two browser tabs could overwrite each other
2. **No optimistic rollback** — if save fails, UI shows data that didn't persist
3. **No undo/redo**
4. **No version history**
5. **Monolithic API** — `/api/data` handles everything; no segmentation by section
6. **No auth** — anyone with the URL can read/write your data

### Classification
| Item | Decision | Reason |
|---|---|---|
| Next.js 14 App Router | KEEP | Solid, no reason to change |
| Neon + JSONB pattern | KEEP | Flexible, schema-free, extends naturally |
| Vercel deployment | KEEP | Works, free tier |
| `db.ts` | KEEP | Clean, reusable |
| All existing page data | KEEP | Not touching personal sections |
| `MobileShell.tsx` | KEEP | Solid responsive shell |
| `Sidebar.tsx` | MODERNIZE | Add Claims group + icons |
| `Header.tsx` | MODERNIZE | Add Claims page title map |
| `CommandBar.tsx` | MODERNIZE | Add Claims pages to search index |
| `Banner.tsx` | REMOVE | Decorative/playful — remove from Home page |
| CSS design tokens | KEEP | Clean dark theme, professional enough |
| CSS print styles | ADD | Required for PDF export |

---

## Known Issues / Blockers

- None blocking — clean codebase, ready to extend
- Vercel cron jobs require Pro plan or hobby plan verification for scheduled functions

---

## Next Build: Claims Work Operating System

**New files to create:**
- `src/lib/claims.ts` — all types + helper functions
- `src/app/api/claims/route.ts` — dedicated Claims API (GET/POST)
- `src/app/api/cron/daily-report/route.ts`
- `src/app/api/cron/hgs-weekly/route.ts`
- `src/app/api/cron/newhire-weekly/route.ts`
- `src/app/claims/page.tsx` — Claims Dashboard
- `src/app/claims/cases/page.tsx` — Daily Case Tracker
- `src/app/claims/transfers/page.tsx` — HGS Tank Transfer Log
- `src/app/claims/huddle/page.tsx` — Team Huddle Notes
- `src/app/claims/accomplishments/page.tsx` — Accomplishments Tracker
- `src/app/claims/oos/page.tsx` — Out-of-Scope Work
- `src/app/claims/new-hire/page.tsx` — New Hire Case Review
- `src/app/claims/todos/page.tsx` — Claims To-Do List
- `src/app/claims/sop/page.tsx` — SOP Knowledge Builder
- `src/app/claims/audits/page.tsx` — Audit Tracker
- `src/app/claims/reports/page.tsx` — Generated Reports Viewer

**Files to modify:**
- `src/components/Sidebar.tsx` — Add Claims section
- `src/components/Header.tsx` — Add Claims page titles
- `src/components/CommandBar.tsx` — Add Claims pages to search
- `src/app/globals.css` — Add print styles for PDF export
- `vercel.json` — Add cron schedules
