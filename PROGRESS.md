# Skolo — Development Progress
*Last updated: 8 May 2026*

> **Pick-up checklist after switching machines:**
> 1. `git pull origin main`
> 2. `cd backend && npm install` and same in `frontend/` and `parent-app/`
> 3. Make sure each `.env` is populated (see env vars below)
> 4. Last shipped commit: `d5f2895` — Modern Academic palette + light auth pages

---

## Live URLs

| Service | URL | Hosted on |
|---|---|---|
| Staff app | https://myskolo.co.za | Cloudflare Pages (auto-deploy) |
| Parent app | https://parent.myskolo.co.za | Cloudflare Pages (auto-deploy) |
| Backend API | https://skolo-api.onrender.com | Render (free tier, ~30s cold start) |
| Database | Supabase project `sxhjsmajoetvdgrpuawa` | Supabase PostgreSQL |
| Email | Resend, FROM `noreply@4dcs.co.za` | Resend |
| GitHub | https://github.com/EhsanRiz/skolo (private) | — |

---

## Tech Stack

- **Staff frontend:** React/Vite PWA → `frontend/` → Cloudflare Pages
- **Parent frontend:** React/Vite PWA → `parent-app/` → Cloudflare Pages (separate project)
- **Backend:** Express.js → `backend/` → Render
- **DB:** Supabase PostgreSQL with RLS (multi-tenant by `school_id`); backend bypasses RLS via service role key
- **Auth:** JWT, 7-day expiry. localStorage keys: `sk_token` (staff), `sk_parent_token` (parent), `sk_user` (user JSON)
- **Email:** Resend, verified domain `4dcs.co.za`
- **PDF:** pdfkit (report cards)
- **Fonts:** Inter via Google Fonts
- **No external UI library** — inline styles + a design-token object `t` in `frontend/src/components/ui.jsx`

---

## Modern Academic Design System

*Established 8 May 2026, applied across staff + parent + landing.*

| Role | Color | Use |
|---|---|---|
| Navy | `#003049` | Primary CTAs, headings, sidebar, brand anchor |
| Navy hover | `#00253a` | Primary button hover |
| Soft Gray | `#f7f7f7` | Page background |
| Sky Blue | `#669bbc` | Secondary accents, active states, info |
| Sky Blue tint | `#e6eff5` | Backgrounds, hovers, secondary buttons |
| Amber | `#f7c548` | **Urgent attention only** — overdue, pending, marketing CTAs |
| Amber tint | `#fef4d6` | Subtle attention surfaces |
| Amber dark | `#b8870a` | Amber text |
| Success | `#16a34a` (`#dcfce7` tint) | Paid/positive states |
| Danger | `#dc2626` (`#fee2e2` tint) | Errors/overdue |
| Border | `#e5e7eb` | Subtle dividers |
| Text | `#1f2937` (primary), `#6b7280` (muted), `#9ca3af` (faint), `#374151` (label) | — |
| Special | `#7c3aed` purple | Reserved for: waived fees, SuperAdmin tier, unread notifications, timetable subjects (semantic differentiation only — not a brand color) |

**Rules:**
- Amber is the only warm color in a cool-toned palette — use it sparingly so it stays as the "attention magnet."
- Sky Blue plays the supporting role to Navy (sidebar active states, info pills, hover tints, chevrons).
- Marketing landing-page CTAs may use Amber for conversion despite the "urgency only" rule.
- Primary action buttons in the app are Navy.

The token system lives at `frontend/src/components/ui.jsx` (the `t` object). Most pages bypass it and use hardcoded hex codes — the colors above were applied via a sweep across 1,755 hex references in 42 files. New code should reference `t.primary`, `t.accent`, `t.attention` etc. rather than hardcoding hex.

---

## Recent Sessions

### 8 May 2026 — Conditional sidebar badges + loading-state polish

- **New backend endpoint `GET /sidebar-counts`** (auth-gated, role-aware) returns `{ messages, waivers, fees, attendance }` in a single call. Pending waivers shown only to admin/principal; overdue fees to admin/bursar/principal; attendance-alerts (learners < 80% in current month) to admin/principal. Messages count for everyone.
- **Conditional amber badges in the staff sidebar:** Layout polls `/sidebar-counts` every 60s. Desktop nav items show an amber count pill (`#fef4d6` bg, `#b8870a` text, max `99+`) when the relevant count > 0. Mobile bottom nav gets a small amber dot (`#f7c548` with navy ring) on the icon. Replaces the previous one-purpose red Messages badge — semantics now match the palette (amber = pending action), and the same pattern surfaces overdue fees, pending waivers, and attendance alerts.
- **New shared `Skeleton` / `SkeletonCard` / `SkeletonRows` / `EmptyState` components in `ui.jsx`** — palette-compliant shimmer animation, wired with a single inline keyframes injection. Replaces the bare "Loading…" / "No data" text on Dashboard (3 sub-dashboards), Messages, Waivers, Attendance (3 sites), LearnerProfile (whole-page + tab-level). Empty-state for "No conversations yet" now shows an icon, title, and a hint.

### 8 May 2026 — App-wide red→amber + palette token normalization

- **Fixed nav-cta button bug:** `Request a Demo` button in landing nav was rendering as solid dark navy with invisible text — `.nav-links a { color: #374151 }` was beating `.btn-primary { color: #fff }` on specificity. Added `color: #fff !important` to `.nav-cta`.
- **Bulk palette token normalization (23 files):** swept off-palette tokens app-wide — `#fef3c7` → `#fef4d6` (amber tint), `#f0f5fa` → `#e6eff5` (Sky Blue tint), `#ca8a04` → `#b8870a` (amber dark, was off-palette deep yellow), `#ea580c` → `#b8870a` (was off-palette deep orange).
- **Semantic red→amber sweep:** following palette discipline (red = error/broken, amber = attention/pending), moved "outstanding/overdue/balance > 0" surfaces to amber dark across staff Dashboard (StatCard accents, KPIs, fee-row colors, attendance-alerts header, rate helpers), staff Fees (status pills, fee rows, balance cells, KPI strip, group summaries, payment dialog "Remaining"), staff Attendance (override toggle, pct rate helper), Settings ("Not invited" pill), LearnerProfile (overdue STATUS_C, Outstanding KPI, balance cells), Learners ("Skipped rows" CSV warning), Timetable (Busy slot indicator, utilization > 80%, foreign-class slot in mini grid), ParentPortal (overdue status, Balance KPI, Overdue warning bar), parent-app Fees/Attendance/Dashboard/Grades, and the shared `unpaid` design token in `ui.jsx`. Red kept where it belongs: F grades, Absent attendance markers, delete/reject/danger buttons, login/register validation errors, error toasts, the receipt's UNPAID stamp, "Suspended" status, and notification badge counts.
- **Rate helpers simplified to 2-tier:** `r >= 80 ? green : amber` instead of `green / amber / red`. A 27% fee collection rate now reads as "needs attention" (amber dark) rather than "broken" (red), matching the palette intent that red is reserved for actual error states.

### 8 May 2026 — Visual polish sweep (post-palette audit)

- **Landing page palette consistency:** swept three off-palette tints (`#fef3c7` → `#fef4d6` amber tint, `#d97706` → `#b8870a` amber dark, `#f0f5fa` → `#e6eff5` Sky Blue tint); decorative purple → Sky Blue on the Audience "Education organisations" globe icon and the Challenges "Real-time visibility" stat. Skolo AI plan tier and Exam grades feature icon keep their purple (justified per palette spec — tier semantic and subject/grades semantic).
- **Sidebar active state → Sky Blue:** `Layout.jsx` `.nav-link.active` background changed from translucent white to `#669bbc` per the Modern Academic mockup spec; notification panel's "general" item bg also fixed to `#e6eff5`.
- **LearnerProfile upgrade CTA:** premium-gate copy now reads "Contact **InnovaEarth** or **4D Climate Solutions** to upgrade…" — both linkable, matches footer attribution.
- **Parent dashboard Outstanding stat:** color changed from danger red `#dc2626` to amber dark `#b8870a` so an outstanding balance reads as "attention-needed" (amber) rather than "error" (red), matching the hero mockup on the landing page.

### 8 May 2026 — Modern Academic palette migration (3 commits)

- `0288ea9` — token system rebuilt around semantic roles (`primary`, `accent`, `attention`, `success`, `danger`); 1,482 hardcoded hex codes swept across 42 files; embedded JPEG 4DCS logos removed from Login/Register; footer attribution everywhere updated to "Developed by [InnovaEarth](https://innovaearth.com) in collaboration with [4D Climate Solutions](https://4dcs.co.za)" with both names clickable
- `b649e54` — landing page hero rebuilt: dark Navy gradient → light Soft-Gray-to-Sky-Blue; new copy "Less admin. More learning."; mockup card became white with mini KPIs (Outstanding in Amber); hero stats row added (12 schools / 3,400+ learners / 2 countries); navbar went white-with-Navy-text; "Request a Demo" hero CTA → Amber
- `d5f2895` — fixes from live review: navbar logo split into icon + wordmark for clean white nav; AI-Powered section → light theme; bottom CTA Demo button green → Amber; Login + Register pages → light Soft-Gray-to-Sky-Blue background with subtle navy equation overlay (was dark Navy with white chalk); SVG logos updated to new Navy/Sky Blue colors

### 13 April 2026 — Attendance + role-based access
- Attendance audit trail, learner filters, fees tab fix, principal fees dashboard (`2298106`)
- Role-based attendance — read-only for admin/principal with edit override (`138da7a`)

### 13 April 2026 — Drag-and-drop timetable builder
- Teacher sidebar + droppable grid (`24e4816`)
- Live teacher availability panel (`4c072ba`)
- Per-teacher mini grid card redesign (`3b426c7`)

### 8 April 2026 — Teacher experience upgrade
- Dashboard charts, My Classes enrichment, Announcements redesign (`d7255fa`)

---

## User Roles & Access

| Role | Access |
|---|---|
| `admin` | Full access — settings, users, learners, fees, grades, attendance |
| `principal` | Read-only fees + learners + grades + attendance, approve/reject waivers, announcements, events, attendance alerts |
| `bursar` | Fees (full), learners, no settings |
| `teacher` | Dashboard, My Classes, Grades (entry), Attendance (register), Events, Announcements |
| `parent` | Parent app only — Dashboard, Fees, Attendance, Grades, Messages, Events, Announcements |
| `super-admin` | Cross-school platform overview |

---

## Project Structure

```
skolo/
├── backend/                   # Express.js API
│   ├── server.js              # Entry, port 3001
│   ├── lib/                   # supabase client, sequences, autoGenerate, email
│   ├── middleware/            # JWT auth, super-admin auth
│   └── routes/                # 29 route files (auth, schools, learners, fees,
│                              #   waivers, events, announcements, teachers,
│                              #   exam-grades, attendance, attendance-alerts,
│                              #   timetable, parent-auth, parent-data,
│                              #   messaging, report-cards, super-admin, etc.)
├── frontend/                  # Staff PWA (React/Vite, port 5173)
│   ├── src/
│   │   ├── App.jsx
│   │   ├── contexts/          # AuthContext, ToastContext
│   │   ├── components/        # Layout (sidebar+mobile), ui.jsx (design tokens)
│   │   ├── pages/             # 23 pages (Dashboard, Learners, Fees, Waivers,
│   │   │                      #   Events, Announcements, Settings, MyClasses,
│   │   │                      #   ExamGrades, Attendance, Timetable, Messages,
│   │   │                      #   LearnerProfile, ParentPortal, Login, Register,
│   │   │                      #   ForgotPassword, ResetPassword, SetPassword,
│   │   │                      #   LandingPage, RequestDemo, SuperAdmin, SuperAdminLogin)
│   │   └── lib/api.js         # Axios instance, JWT interceptor
│   └── public/                # PWA icons, skolo-promo.mp4, logo SVGs
├── parent-app/                # Parent PWA (separate React/Vite, port 5174)
│   ├── src/
│   │   ├── pages/             # 13 pages (Login, Dashboard, Fees, Attendance,
│   │   │                      #   Grades, Timetable, Events, Announcements,
│   │   │                      #   Messages, Profile, ForgotPassword,
│   │   │                      #   ResetPassword, SetPassword)
│   │   └── components/Layout.jsx
│   └── public/                # Same logo SVGs (kept in sync)
├── supabase/migrations/       # 21 SQL files, all run in Supabase SQL Editor
├── pitch/                     # Pitch deck materials
├── PROGRESS.md                # This file
└── CLAUDE.md                  # Working instructions for Claude
```

---

## Database Migrations

All run in Supabase SQL Editor. Check `supabase/migrations/` for actual SQL.

| File | Description | Status |
|---|---|---|
| `001_initial_schema.sql` | Core tables, RLS, seed data | ✅ |
| `002_rls_policies.sql` | RLS policies | ✅ |
| `003_logo_url.sql` | `logo_url` on schools | ✅ |
| `004_fee_ledger.sql` | fee_plans, fee_ledger, teachers | ✅ |
| `005_reference_numbers.sql` | reference_no for learners + teachers | ✅ |
| `006_portal_tokens.sql` | portal_token on guardians | ✅ |
| `007_learner_profile.sql` | exam_results, learner_awards, learner_notes | ✅ |
| `008_medical_fields.sql` | medical_condition, doctor_name, doctor_phone | ✅ |
| `009_waivers.sql` | amount_waived, waiver_reason on fee_ledger | ✅ |
| `010_waiver_requests.sql` | waiver_requests + notifications | ✅ |
| `011_invite_tokens.sql` | invite_token, invite_expires_at, password_set | ✅ |
| `012_teacher_classes.sql` | teacher_classes junction + user_id on teachers | ✅ |
| `013_reset_tokens.sql` | reset_token + reset_expires_at | ✅ |
| `014_grade_boundaries.sql` | grade_boundaries JSONB on schools | ✅ |
| `015_attendance.sql` | attendance table (P/A/L/E, unique learner+date) | ✅ |
| `016_super_admin.sql` | super_admins table | ✅ |
| `016_timetable.sql` | timetable + teacher_availability | ✅ |
| `017_demo_requests.sql` | demo_requests from landing page | ✅ |
| `018_school_invites.sql` | school invite flow | ✅ |
| `019_messaging_and_parent_auth.sql` | conversations, messages, parent role on users, push_subscriptions | ✅ |
| `020_attendance_audit.sql` | attendance_audit log | ✅ |

> Note: there are two `016_*` files — `016_super_admin.sql` and `016_timetable.sql`. They were created in parallel branches. Run order doesn't matter between them.

---

## Environment Variables

### Backend (Render — `.env`)
```
SUPABASE_URL=https://sxhjsmajoetvdgrpuawa.supabase.co
SUPABASE_SERVICE_KEY=<service-role-key>
JWT_SECRET=<jwt-secret>
PORT=3001
FRONTEND_URL=https://myskolo.co.za
RESEND_API_KEY=<resend-api-key>
```

### Staff frontend (Cloudflare Pages — `.env`)
```
VITE_API_URL=https://skolo-api.onrender.com
```

### Parent app (Cloudflare Pages — `.env`)
```
VITE_API_URL=https://skolo-api.onrender.com
```

---

## Key Business Logic

### Fee auto-generation
- Runs on Fees page load, learner enrolment, and learner profile fees tab
- `POST /fee-ledger/auto-generate` is idempotent
- Dedup is **month-level** (`YYYY-MM`), not date-level
- Status computed live: due_date vs today, payments vs amount_due

### Waiver workflow
1. Bursar requests waiver (with reason + optional note) → email to principal + bell notification
2. Principal approves/rejects from Waivers page → email to bursar + bell notification
3. On approve, fee_ledger updated with `amount_waived`, `waiver_reason`, `waived_by`

### Parent portal vs Parent app
- **Portal (legacy):** `/parent/:token` on staff frontend, no login, hex token URL, read-only fee summary
- **App (new):** separate PWA at parent.myskolo.co.za, `parent` role on users table linked via `guardian_id`, full features (fees, attendance, grades, messages, events)

### Internal messaging
- Tables: `conversations` + `conversation_participants` + `messages`
- Types: direct (1:1 staff↔parent), class, grade, school-wide
- Polling: 5s for messages, 30s for unread count badge
- Supabase Realtime planned for Phase 2

### Custom grade scale
- Per-school in `schools.grade_boundaries` JSONB array `[{grade, min}]`
- Defaults to A/B/C/D/F if not configured
- Applies to exam grades, learner profile, report cards

### Attendance
- Unique constraint on `learner_id + date` — safe to re-submit register
- Audit table tracks edits (who, when, old → new)
- Principal/admin read-only with edit override

---

## Local Dev

```bash
# Backend (port 3001)
cd backend && npm install && npm run dev

# Staff frontend (port 5173)
cd frontend && npm install && npm run dev

# Parent app (port 5174)
cd parent-app && npm install && npm run dev
```

Each requires its own `.env` populated.

---

## Deployment

```bash
git push origin main
```
- Cloudflare Pages auto-deploys both `frontend/` and `parent-app/` (verified working)
- Render auto-deploys `backend/` (✅ working as of `2298106`; was idle for the May palette commits since they didn't touch backend code)
- ~30-60 sec for Cloudflare, ~3-5 min for Render
- Render free tier spins down after inactivity, ~30s cold start on first request

If a deploy doesn't fire automatically, click **"Create deployment"** on Cloudflare Pages or **"Manual Deploy"** on Render.

---

## Still To Do

### Near-term
- [ ] **Bulk SMS for overdue fees** — Africa's Talking integration (needs AT account + credit)
- [ ] **Bank reconciliation** (paid feature) — upload bank statement, match by reference_no
- [ ] **Read receipts on announcements**
- [ ] **Attendance threshold alerts** — flag learners below e.g. 80%
- [ ] Consider replacing `#7c3aed` purple (waived/SuperAdmin/unread) with a Modern-Academic-aligned alternative

### Visual polish (post-palette)
- [x] Review remaining landing-page sections (Pain Points, Features, Audience, Pricing, Challenges, FAQ) — confirm they flow with the new lighter theme *(8 May)*
- [x] Check `LearnerProfile.jsx` "Contact 4D Climate Solutions to upgrade" body copy — now references both InnovaEarth and 4DCS *(8 May)*
- [x] Audit `Layout.jsx` sidebar against the mockup spec — Sky Blue active state applied *(8 May)*
- [x] Spot-check parent app dashboard against the mockup — Outstanding stat now amber *(8 May)*

### Phase 2
- [ ] Supabase Realtime for messaging (replace 5s polling)
- [ ] Attendance trends chart on Dashboard
- [ ] Bulk grade import from CSV
- [ ] Multi-language UI (Sesotho, Afrikaans)

### Phase 3
- [ ] Digital assignments
- [ ] AI homework assistant
- [ ] AI early warning alerts (the "Skolo AI" plan tier)
- [ ] Smart reports (natural language queries)
- [ ] Automated parent comms drafting

---

## Important Technical Notes

- Render free tier spins down after inactivity — first request ~30s delay
- `sk_token` = staff JWT in localStorage; `sk_parent_token` = parent JWT
- CORS allows `myskolo.co.za`, `parent.myskolo.co.za`, `*.skolo.pages.dev`, `*.myskolo.pages.dev`, localhost
- Supabase service role key bypasses RLS — all backend ops use this
- Logo: base64 data URL in `schools.logo_url` — no Storage bucket required
- Fee dedup is month-level, not date-level
- Invite tokens expire in 48 hours
- Password reset tokens expire in 1 hour (`crypto.randomBytes(32)`)
- Teacher records auto-created when role `teacher` user accepts invite
- Email FROM: `noreply@4dcs.co.za` (verified via Resend)
- Grade boundaries stored as JSONB array, sorted descending by min
- Cloudflare Pages `_redirects` file required in `public/` for SPA deep links
- `FRONTEND_URL` env on Render — fallback hardcoded to `https://myskolo.co.za`

---

## Onboarding a New School

1. Demo request via landing page → super-admin reviews → sends invite
2. Admin accepts invite at `/register?token=...` → creates school + admin account
3. Admin: Settings → Grades & Classes (R–12 + class letters)
4. Admin: Settings → Fee Plans (monthly/termly per grade)
5. Admin: Settings → Grade Scale (optional, defaults to A/B/C/D/F)
6. Admin: Learners → import CSV or add manually
7. Admin: Settings → Staff Accounts → invite teachers/bursar/principal
8. Teachers appear in Settings → Teachers automatically
9. Admin: assign classes to teachers (Settings → Teachers → + class)
10. Daily: teachers take attendance, bursars collect fees, principals approve waivers
11. Parent invites: Settings → Parent Accounts → email invite → parent sets password and downloads PWA

---

## Pricing (target)

| Plan | Lesotho | South Africa | Notes |
|---|---|---|---|
| Free | Free | Free | Basic features, capped learners |
| Standard | M800/mo | R800/mo | Unlimited learners, exam grades, timetable, parent portal |
| Pro | M1,150/mo | R1,150/mo | + SMS announcements, waivers, awards, priority support |
| Skolo AI | M1,450/mo | R1,450/mo | + AI alerts, smart reports, automated comms |

---

## Brand Attribution

Footer everywhere reads:
> Developed by [InnovaEarth](https://innovaearth.com) in collaboration with [4D Climate Solutions](https://4dcs.co.za)

Both names link out (new tab). Applied on:
- Staff: Login, Register, SetPassword, ForgotPassword, ResetPassword, LandingPage
- Parent app: Login, SetPassword, ForgotPassword, ResetPassword
