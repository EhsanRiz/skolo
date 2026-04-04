# Skolo — Development Progress
*Last updated: 4 April 2026*

---

## 🌐 Live URLs

| Service | URL |
|---|---|
| Frontend | https://skolo.pages.dev (Cloudflare Pages) |
| Backend API | https://skolo-api.onrender.com (Render free tier) |
| Database | https://sxhjsmajoetvdgrpuawa.supabase.co (Supabase PostgreSQL) |
| GitHub | https://github.com/EhsanRiz/skolo (private) |

---

## 🏗️ Tech Stack

- **Frontend:** React/Vite PWA → Cloudflare Pages
- **Backend:** Express.js → Render (free tier — spins down after inactivity, ~30s cold start)
- **Database:** Supabase PostgreSQL
- **Auth:** JWT stored in localStorage as `sk_token` and `sk_user`
- **Email:** Resend API — FROM: `noreply@4dcs.co.za` (verified domain)

---

## 🔑 Environment Variables

### Render (Backend)
```
SUPABASE_URL=https://sxhjsmajoetvdgrpuawa.supabase.co
SUPABASE_SERVICE_KEY=<service role key>
JWT_SECRET=<jwt secret>
FRONTEND_URL=https://skolo.pages.dev
RESEND_API_KEY=<resend api key — get from resend.com, revoke old ones>
PORT=3001
```

### Cloudflare Pages (Frontend)
```
VITE_API_URL=https://skolo-api.onrender.com
```

---

## 👤 User Roles & Access

| Role | Access |
|---|---|
| `admin` | Full access — all settings, fees, learners, staff management |
| `principal` | Read-only fees + learners, approve/reject waivers, announcements, events, read-only grades + attendance |
| `bursar` | Fees (full), learners, no settings |
| `teacher` | My Classes, Grades (entry), Attendance (register), Events, Announcements |

**Nav by role:**
- `admin/bursar` — Dashboard, Learners, Fees, Waivers, Events, Announcements, Settings
- `principal` — Dashboard, Learners (read-only), Fees (read-only), Waivers (approval), Grades (read-only), Attendance (read-only), Events, Announcements
- `teacher` — Dashboard, My Classes, Grades, Attendance, Events, Announcements

---

## 📁 Project Structure

```
skolo/
├── backend/
│   ├── server.js
│   ├── lib/
│   │   ├── supabase.js
│   │   ├── sequences.js        # Reference number generator (00001, T-0001)
│   │   ├── autoGenerate.js     # Auto fee generation (monthly, idempotent)
│   │   └── email.js            # Resend: invite, waiver, password reset emails
│   ├── middleware/
│   │   └── auth.js
│   └── routes/
│       ├── auth.js             # Login, register-school, set-password, verify-invite, forgot/reset-password
│       ├── schools.js          # School config, PATCH /me (incl. grade_boundaries), countries, regions
│       ├── learners.js         # CRUD + bulk import + auto-generate fees on enrol
│       ├── grades.js           # Grades + classes CRUD
│       ├── fees.js             # Legacy fee schedules (kept for old data)
│       ├── fee-plans.js        # Fee plans (monthly/termly per grade)
│       ├── fee-ledger.js       # Smart ledger: auto-generate, pay, waive, summary, preview
│       ├── events.js           # School calendar
│       ├── announcements.js    # Announcements
│       ├── teachers.js         # Teacher records CRUD
│       ├── teacher-classes.js  # Teacher↔class assignments + /my endpoint
│       ├── users.js            # Staff accounts (invite flow, no password on create)
│       ├── upload.js           # Logo upload → base64 in DB
│       ├── portal.js           # Parent portal (public, token-secured)
│       ├── learner-profile.js  # Exam results, awards, notes CRUD
│       ├── waivers.js          # Waiver request → approve/reject flow + emails
│       ├── notifications.js    # Bell notifications (unread count, mark read)
│       ├── exam-grades.js      # Class results fetch + bulk upsert + subject autocomplete
│       └── attendance.js       # Daily register, monthly summary, learner history
└── frontend/src/
    ├── App.jsx                 # Routes + ProtectedRoute
    ├── contexts/
    │   ├── AuthContext.jsx     # useAuth() — login, logout, school, refreshSchool
    │   └── ToastContext.jsx    # useToast() — success/error/warning/info
    ├── components/
    │   ├── Layout.jsx          # Role-gated nav, bell icon, notification dropdown
    │   └── ui.jsx              # Icons, badges, ActionBtn, design tokens
    └── pages/
        ├── Login.jsx           # Login + forgot password link + 4DCS branding footer
        ├── Register.jsx        # School registration + 4DCS branding footer
        ├── SetPassword.jsx     # Invite accept + set password (public)
        ├── ForgotPassword.jsx  # Email input → sends reset link (public)
        ├── ResetPassword.jsx   # Token-based new password + auto-login (public)
        ├── Dashboard.jsx       # Role-aware: KPIs, grade collection bars, pending cards
        ├── Learners.jsx        # Table + add/edit/delete + import + role guards
        ├── LearnerProfile.jsx  # 5-tab profile: Overview, Fees, Exam Grades🔒, Awards🔒, Notes🔒
        ├── Fees.jsx            # Bursar-first: search, grade groups, pay, waive request, receipt
        ├── Waivers.jsx         # Waiver queue (submit / approve / reject)
        ├── Events.jsx          # Calendar
        ├── Announcements.jsx   # Feed + compose
        ├── Settings.jsx        # Grades, Fee Plans, Teachers, Grade Scale, Profile, Staff
        ├── MyClasses.jsx       # Teacher view — their assigned classes + learners
        ├── ExamGrades.jsx      # Spreadsheet grade entry by class/subject/term/year
        ├── Attendance.jsx      # Daily register + monthly summary + learner history
        └── ParentPortal.jsx    # Public parent fee portal (no login, token URL)
```

---

## ✅ Completed Features

### Auth & Users
- [x] School registration → admin account
- [x] JWT login + role-based access
- [x] Invite-by-email flow (Resend) — no password set by admin
- [x] Set-password page (`/set-password/:token`) — auto-login after setting
- [x] Resend invite + Copy link to clipboard
- [x] Delete staff account
- [x] Role-gated navigation (admin/principal/bursar/teacher see different nav)
- [x] **Forgot password** — email reset link (1hr expiry, never reveals if email exists)
- [x] **Reset password** — token-based, password strength meter, auto-login on success
- [x] Cloudflare Pages `_redirects` — SPA routing fixed (all deep links work)

### Learners
- [x] CRUD with guardian linkage
- [x] Bulk import CSV/Excel
- [x] Reference numbers `00001–99999` per school
- [x] Parent portal link from learner profile
- [x] Medical fields (condition, doctor, phone) — optional, with consent note
- [x] Role guards — principal read-only, teacher via My Classes only

### Fee System
- [x] Fee Plans (monthly/termly, per grade, due_day)
- [x] **Auto-generation** — runs on page load + on learner enrol (idempotent, month-level dedup)
- [x] Bursar view: search, grade-grouped collapsible, status pills
- [x] Pay (full or partial), auto-status update
- [x] **Waiver request flow** — bursar requests → principal gets email + bell → approves/rejects → bursar notified
- [x] Waiver reasons + custom reason for "Other"
- [x] PDF receipt — browser print/save, includes school logo, PAID/WAIVED stamp
- [x] Export to Excel (filtered month + totals row)
- [x] Monthly totals bar (Due/Collected/Outstanding/Rate%)
- [x] Read-only for principal (no Pay/Waive/Delete buttons)
- [x] Status badges: paid / partial / partial_waiver / waived / overdue / pending

### Learner Profile (5 tabs)
- [x] Overview — details, guardian, portal link
- [x] Fees — this learner's ledger, pay button
- [x] Exam Grades 🔒 PRO — subjects × Term 1–4, auto letter grade per school scale
- [x] Awards 🔒 PRO — achievement cards
- [x] Notes 🔒 PRO — timestamped staff notes

### Notifications & Waivers
- [x] Bell icon in sidebar with unread count badge
- [x] Notification dropdown — click to navigate, mark as read
- [x] Waiver request → email to principal + in-app notification
- [x] Approval/rejection → email to bursar + in-app notification
- [x] Waivers page with filter tabs (pending/approved/rejected/all)

### Teachers
- [x] Teacher records with reference numbers (T-0001)
- [x] **Auto-created** when staff account with role `teacher` is invited
- [x] Class assignments (many-to-many) — teacher teaches multiple classes
- [x] Home class designation 🏠
- [x] My Classes page — teacher sees their classes + learners, click → profile
- [x] Link teacher record to login account (auto on invite, manual fallback)

### Exam Grades
- [x] Grades page in nav — teacher, admin, principal
- [x] Teacher: class + subject pre-filled from assignment, pick term + year
- [x] Spreadsheet grid — mark input 0–100, live letter grade badge
- [x] Bulk upsert (safe to re-save, unique constraint on learner+subject+term+year)
- [x] Stats bar: learners, marked, unmarked, class average
- [x] Sticky "unsaved changes" bar
- [x] Principal read-only
- [x] **Custom grade scale per school** — Settings → Grade Scale tab
  - Admin defines grade symbols + min marks (e.g. Distinction ≥ 80, Merit ≥ 65…)
  - Falls back to A/B/C/D/F defaults if not configured
  - Saves to `schools.grade_boundaries` JSONB, applies instantly everywhere

### Attendance
- [x] Attendance page — teacher, admin, principal
- [x] **Daily Register tab** — date picker with prev/next, mark-all shortcuts
  - P / A / L / E toggles per learner + optional note
  - Stat cards (present/absent/late/excused counts)
  - Sticky save bar, bulk upsert (safe to re-submit)
  - Principal read-only
- [x] **Monthly Summary tab** — per-learner P/A/L/E counts + attendance % bar (green/amber/red)
- [x] **Learner History tab** — pick learner + month, daily status list + monthly totals

### Settings
- [x] Grades & Classes — add standard grades R–12, class letters
- [x] Fee Plans — create, activate/pause, delete
- [x] Teachers — class assignment, link account, auto-appears on teacher invite
- [x] **Grade Scale** — custom grade symbols + min marks per school
- [x] School Profile — edit + logo upload (base64 in DB, no bucket needed)
- [x] Staff Accounts — invite (email), resend, copy link, disable, delete
- [x] Role selector includes: Teacher / Bursar / Principal / Admin

### Dashboard
- [x] Personalised greeting by time of day
- [x] 4 KPI stat cards (learners, due, collected, rate)
- [x] Collection by grade — progress bars (red/amber/green)
- [x] Pending/overdue cards — click → learner profile
- [x] Outstanding drawer (slide-in, searchable)
- [x] Quick actions — role-aware (waiver queue prominent for principal)
- [x] All-paid celebration state 🎉

### Parent Portal
- [x] Token-based secure URL (no login)
- [x] Shows: guardian name, all children, fee summary, recent history, overdue warnings
- [x] Generated from Learner → Overview tab

### Infrastructure
- [x] Email: Resend API, `noreply@4dcs.co.za` (verified domain)
- [x] CORS: allows `skolo.pages.dev` + all preview subdomains
- [x] Logo: base64 stored in DB (no Supabase Storage bucket needed)
- [x] Mobile responsive: hamburger drawer + bottom nav on mobile
- [x] Cloudflare Pages `_redirects` → SPA routing (all `/path/:param` URLs work)

---

## 🗄️ Database Migrations (all run in Supabase SQL Editor)

| File | Description | Status |
|---|---|---|
| `001_initial_schema.sql` | Core tables, RLS, seed data | ✅ Run |
| `002_rls_policies.sql` | RLS policies | ✅ Run |
| `003_logo_url.sql` | `logo_url TEXT` on schools | ✅ Run |
| `004_fee_ledger.sql` | fee_plans, fee_ledger, teachers | ✅ Run |
| `005_reference_numbers.sql` | reference_no for learners + teachers | ✅ Run |
| `006_portal_tokens.sql` | portal_token on guardians | ✅ Run |
| `007_learner_profile.sql` | exam_results, learner_awards, learner_notes | ✅ Run |
| `008_medical_fields.sql` | medical_condition, doctor_name, doctor_phone | ✅ Run |
| `009_waivers.sql` | amount_waived, waiver_reason, waiver_note, waived_by on fee_ledger | ✅ Run |
| `010_waiver_requests.sql` | waiver_requests + notifications tables | ✅ Run |
| `011_invite_tokens.sql` | invite_token, invite_expires_at, password_set on users | ✅ Run |
| `012_teacher_classes.sql` | teacher_classes junction table + user_id on teachers | ✅ Run |
| `013_reset_tokens.sql` | reset_token + reset_expires_at on users | ✅ Run |
| `014_grade_boundaries.sql` | grade_boundaries JSONB on schools | ✅ Run |
| `015_attendance.sql` | attendance table (unique learner+date, P/A/L/E) | ✅ Run |

---

## 🔲 Still To Do

### Near-term
- [ ] **Bulk SMS "remind all overdue"** — Africa's Talking API (needs AT account)
- [ ] **Custom domain** — `skolo.co.za` or `skolo.app` — register + point to Cloudflare
- [ ] **Bank reconciliation** (paid feature) — upload bank statement, match by reference_no
- [ ] **Read receipts on announcements**

### Phase 2
- [ ] Report cards — export learner results + attendance as PDF
- [ ] Timetable / teacher scheduling (calendar-based class assignment)
- [ ] Parent portal: SMS delivery on enrolment
- [ ] Attendance alerts — flag learners below threshold (e.g. < 80%)

### Phase 3
- [ ] Digital assignments
- [ ] AI homework assistant
- [ ] Results and report cards export

---

## 📋 Local Dev

```bash
# Backend (port 3001)
cd ~/Projects/skolo/backend && npm run dev

# Frontend (port 5173)
cd ~/Projects/skolo/frontend && npm run dev
```

---

## ⚠️ Important Technical Notes

- Render free tier spins down after inactivity — first request ~30s delay
- `sk_token` is the localStorage JWT key
- CORS allows `skolo.pages.dev` + `*.skolo.pages.dev` + localhost
- Supabase service role key bypasses RLS — all backend ops use this
- Logo: base64 data URL in `schools.logo_url` — no bucket required
- Fee dedup is **month-level** (`YYYY-MM`) not date-level — prevents duplicates
- Auto-generate runs on: Fees page load, learner enrolment, learner profile fees tab
- Invite tokens expire in 48 hours — admin can resend or copy link
- Teacher records auto-created when `teacher` role user accepts invite
- Email FROM: `noreply@4dcs.co.za` (Resend, verified via `4dcs.co.za`)
- Waiver approval: bursar requests → principal email+bell → approve/reject → bursar email+bell
- Password reset tokens expire in 1 hour — backend uses `crypto.randomBytes(32)`
- `FRONTEND_URL` env var must be set on Render — fallback hardcoded to `https://skolo.pages.dev`
- Grade boundaries stored as JSONB array `[{grade, min}]` sorted descending by min
- Attendance unique constraint: one record per `learner_id + date` — safe to re-submit register
- `_redirects` file in `frontend/public/` — required for Cloudflare Pages SPA routing

---

## 💰 Pricing Model (target)

| Market | Price | Notes |
|---|---|---|
| Lesotho | M500–M800/month | ~R375–R600 |
| South Africa | R800–R1,500/month | Cheaper than any alternative |

PRO features (locked): Exam Grades, Awards, Notes on learner profile

---

## 🚀 Onboarding a New School

1. School registers at `/register` → picks country → district
2. Admin creates grades → Settings → Grades & Classes
3. Admin creates fee plans → Settings → Fee Plans
4. Admin configures grade scale → Settings → Grade Scale (optional, defaults to A/B/C/D/F)
5. Admin imports learners or adds manually
6. Admin invites staff → Settings → Staff Accounts (invite email sent automatically)
7. Teachers appear in Teachers tab automatically after accepting invite
8. Admin assigns classes to teachers → Settings → Teachers → + class
9. Fees auto-generate monthly — bursar just collects
10. Teachers take daily attendance → Attendance → Register
11. Parent gets portal link from Learner → Overview tab


---

## 🌐 Live URLs

| Service | URL |
|---|---|
| Frontend | https://skolo.pages.dev (Cloudflare Pages) |
| Backend API | https://skolo-api.onrender.com (Render free tier) |
| Database | https://sxhjsmajoetvdgrpuawa.supabase.co (Supabase PostgreSQL) |
| GitHub | https://github.com/EhsanRiz/skolo (private) |

---

## 🏗️ Tech Stack

- **Frontend:** React/Vite PWA → Cloudflare Pages
- **Backend:** Express.js → Render (free tier — spins down after inactivity, ~30s cold start)
- **Database:** Supabase PostgreSQL
- **Auth:** JWT stored in localStorage as `sk_token` and `sk_user`
- **Email:** Resend API — FROM: `noreply@4dcs.co.za` (verified domain)

---

## 🔑 Environment Variables

### Render (Backend)
```
SUPABASE_URL=https://sxhjsmajoetvdgrpuawa.supabase.co
SUPABASE_SERVICE_KEY=<service role key>
JWT_SECRET=<jwt secret>
FRONTEND_URL=https://skolo.pages.dev
RESEND_API_KEY=<resend api key — get from resend.com, revoke old ones>
PORT=3001
```

### Cloudflare Pages (Frontend)
```
VITE_API_URL=https://skolo-api.onrender.com
```

---

## 👤 User Roles & Access

| Role | Access |
|---|---|
| `admin` | Full access — all settings, fees, learners, staff management |
| `principal` | Read-only fees + learners, approve/reject waivers, announcements, events |
| `bursar` | Fees (full), learners, no settings |
| `teacher` | My Classes only — their assigned classes + learner profiles (no fees) |

**Nav by role:**
- `admin/bursar` — Dashboard, Learners, Fees, Waivers, Events, Announcements, Settings
- `principal` — Dashboard, Learners (read-only), Fees (read-only), Waivers (approval), Events, Announcements
- `teacher` — Dashboard, My Classes, Events, Announcements

---

## 📁 Project Structure

```
skolo/
├── backend/
│   ├── server.js
│   ├── lib/
│   │   ├── supabase.js
│   │   ├── sequences.js        # Reference number generator (00001, T-0001)
│   │   ├── autoGenerate.js     # Auto fee generation (monthly, idempotent)
│   │   └── email.js            # Resend email helper (invite, waiver, decision)
│   ├── middleware/
│   │   └── auth.js
│   └── routes/
│       ├── auth.js             # Login, register-school, set-password, verify-invite
│       ├── schools.js          # School config, PATCH /me, countries, regions
│       ├── learners.js         # CRUD + bulk import + auto-generate fees on enrol
│       ├── grades.js           # Grades + classes CRUD
│       ├── fees.js             # Legacy fee schedules (kept for old data)
│       ├── fee-plans.js        # Fee plans (monthly/termly per grade)
│       ├── fee-ledger.js       # Smart ledger: auto-generate, pay, waive, summary, preview
│       ├── events.js           # School calendar
│       ├── announcements.js    # Announcements
│       ├── teachers.js         # Teacher records CRUD
│       ├── teacher-classes.js  # Teacher↔class assignments + /my endpoint
│       ├── users.js            # Staff accounts (invite flow, no password on create)
│       ├── upload.js           # Logo upload → base64 in DB
│       ├── portal.js           # Parent portal (public, token-secured)
│       ├── learner-profile.js  # Exam results, awards, notes CRUD
│       ├── waivers.js          # Waiver request → approve/reject flow + emails
│       └── notifications.js    # Bell notifications (unread count, mark read)
└── frontend/src/
    ├── App.jsx                 # Routes + ProtectedRoute
    ├── contexts/
    │   ├── AuthContext.jsx     # useAuth() — login, logout, school, refreshSchool
    │   └── ToastContext.jsx    # useToast() — success/error/warning/info
    ├── components/
    │   ├── Layout.jsx          # Role-gated nav, bell icon, notification dropdown
    │   └── ui.jsx              # Icons, badges, ActionBtn, design tokens
    └── pages/
        ├── Login.jsx           # Login + 4DCS branding footer
        ├── Register.jsx        # School registration
        ├── SetPassword.jsx     # Invite accept + set password (public)
        ├── Dashboard.jsx       # Role-aware: KPIs, grade collection bars, pending cards
        ├── Learners.jsx        # Table + add/edit/delete + import + role guards
        ├── LearnerProfile.jsx  # 5-tab profile: Overview, Fees, Exam Grades🔒, Awards🔒, Notes🔒
        ├── Fees.jsx            # Bursar-first: search, grade groups, pay, waive request, receipt
        ├── Waivers.jsx         # Waiver queue (submit / approve / reject)
        ├── Events.jsx          # Calendar
        ├── Announcements.jsx   # Feed + compose
        ├── Settings.jsx        # Grades, Fee Plans, Teachers (w/ class assign), Profile, Staff
        ├── MyClasses.jsx       # Teacher view — their assigned classes + learners
        └── ParentPortal.jsx    # Public parent fee portal (no login, token URL)
```

---

## ✅ Completed Features

### Auth & Users
- [x] School registration → admin account
- [x] JWT login + role-based access
- [x] Invite-by-email flow (Resend) — no password set by admin
- [x] Set-password page (`/set-password/:token`) — auto-login after setting
- [x] Resend invite + Copy link to clipboard
- [x] Delete staff account
- [x] Role-gated navigation (admin/principal/bursar/teacher see different nav)

### Learners
- [x] CRUD with guardian linkage
- [x] Bulk import CSV/Excel
- [x] Reference numbers `00001–99999` per school
- [x] Parent portal link from learner profile
- [x] Medical fields (condition, doctor, phone) — optional, with consent note
- [x] Role guards — principal read-only, teacher via My Classes only

### Fee System
- [x] Fee Plans (monthly/termly, per grade, due_day)
- [x] **Auto-generation** — runs on page load + on learner enrol (idempotent, month-level dedup)
- [x] Bursar view: search, grade-grouped collapsible, status pills
- [x] Pay (full or partial), auto-status update
- [x] **Waiver request flow** — bursar requests → principal gets email + bell → approves/rejects → bursar notified
- [x] Waiver reasons + custom reason for "Other"
- [x] PDF receipt — browser print/save, includes school logo, PAID/WAIVED stamp
- [x] Export to Excel (filtered month + totals row)
- [x] Monthly totals bar (Due/Collected/Outstanding/Rate%)
- [x] Read-only for principal (no Pay/Waive/Delete buttons)
- [x] Status badges: paid / partial / partial_waiver / waived / overdue / pending

### Learner Profile (5 tabs)
- [x] Overview — details, guardian, portal link
- [x] Fees — this learner's ledger, pay button
- [x] Exam Grades 🔒 PRO — subjects × Term 1–4, auto A/B/C/D/F
- [x] Awards 🔒 PRO — achievement cards
- [x] Notes 🔒 PRO — timestamped staff notes

### Notifications & Waivers
- [x] Bell icon in sidebar with unread count badge
- [x] Notification dropdown — click to navigate, mark as read
- [x] Waiver request → email to principal + in-app notification
- [x] Approval/rejection → email to bursar + in-app notification
- [x] Waivers page with filter tabs (pending/approved/rejected/all)

### Teachers
- [x] Teacher records with reference numbers (T-0001)
- [x] **Auto-created** when staff account with role `teacher` is invited
- [x] Class assignments (many-to-many) — teacher teaches multiple classes
- [x] Home class designation 🏠
- [x] My Classes page — teacher sees their classes + learners, click → profile
- [x] Link teacher record to login account (auto on invite, manual fallback)

### Settings
- [x] Grades & Classes — add standard grades R–12, class letters
- [x] Fee Plans — create, activate/pause, delete
- [x] Teachers — class assignment, link account, auto-appears on teacher invite
- [x] School Profile — edit + logo upload (base64 in DB, no bucket needed)
- [x] Staff Accounts — invite (email), resend, copy link, disable, delete
- [x] Role selector includes: Teacher / Bursar / Principal / Admin

### Dashboard
- [x] Personalised greeting by time of day
- [x] 4 KPI stat cards (learners, due, collected, rate)
- [x] Collection by grade — progress bars (red/amber/green)
- [x] Pending/overdue cards — click → learner profile
- [x] Outstanding drawer (slide-in, searchable)
- [x] Quick actions — role-aware (waiver queue prominent for principal)
- [x] All-paid celebration state 🎉

### Parent Portal
- [x] Token-based secure URL (no login)
- [x] Shows: guardian name, all children, fee summary, recent history, overdue warnings
- [x] Generated from Learner → Overview tab

### Infrastructure
- [x] Email: Resend API, `noreply@4dcs.co.za` (verified domain)
- [x] CORS: allows `skolo.pages.dev` + all preview subdomains
- [x] Logo: base64 stored in DB (no Supabase Storage bucket needed)
- [x] Mobile responsive: hamburger drawer + bottom nav on mobile

---

## 🗄️ Database Migrations (all run in Supabase SQL Editor)

| File | Description | Status |
|---|---|---|
| `001_initial_schema.sql` | Core tables, RLS, seed data | ✅ Run |
| `002_rls_policies.sql` | RLS policies | ✅ Run |
| `003_logo_url.sql` | `logo_url TEXT` on schools | ✅ Run |
| `004_fee_ledger.sql` | fee_plans, fee_ledger, teachers | ✅ Run |
| `005_reference_numbers.sql` | reference_no for learners + teachers | ✅ Run |
| `006_portal_tokens.sql` | portal_token on guardians | ✅ Run |
| `007_learner_profile.sql` | exam_results, learner_awards, learner_notes | ✅ Run |
| `008_medical_fields.sql` | medical_condition, doctor_name, doctor_phone | ✅ Run |
| `009_waivers.sql` | amount_waived, waiver_reason, waiver_note, waived_by on fee_ledger | ✅ Run |
| `010_waiver_requests.sql` | waiver_requests + notifications tables | ✅ Run |
| `011_invite_tokens.sql` | invite_token, invite_expires_at, password_set on users | ✅ Run |
| `012_teacher_classes.sql` | teacher_classes junction table + user_id on teachers | ✅ Run |

---

## 🔲 Still To Do

### Near-term
- [ ] **Bulk SMS "remind all overdue"** — Africa's Talking API (needs AT account)
- [ ] **Custom domain** — `skolo.co.za` or `skolo.app` — register + point to Cloudflare
- [ ] **Register page 4DCS footer** — same as login page
- [ ] **Forgot password** — email reset link flow
- [ ] **Teacher — enter exam grades** for their subject across their classes
- [ ] **Bank reconciliation** (paid feature) — upload bank statement, match by reference_no

### Phase 2
- [ ] Attendance tracking
- [ ] Timetable / teacher scheduling (calendar-based class assignment)
- [ ] Parent portal: SMS delivery on enrolment
- [ ] Read receipts on announcements
- [ ] Report cards

### Phase 3
- [ ] Digital assignments
- [ ] AI homework assistant
- [ ] Results and report cards export

---

## 📋 Local Dev

```bash
# Backend (port 3001)
cd ~/Projects/skolo/backend && npm run dev

# Frontend (port 5173)
cd ~/Projects/skolo/frontend && npm run dev
```

---

## ⚠️ Important Technical Notes

- Render free tier spins down after inactivity — first request ~30s delay
- `sk_token` is the localStorage JWT key
- CORS allows `skolo.pages.dev` + `*.skolo.pages.dev` + localhost
- Supabase service role key bypasses RLS — all backend ops use this
- Logo: base64 data URL in `schools.logo_url` — no bucket required
- Fee dedup is **month-level** (`YYYY-MM`) not date-level — prevents duplicates
- Auto-generate runs on: Fees page load, learner enrolment, learner profile fees tab
- Invite tokens expire in 48 hours — admin can resend or copy link
- Teacher records auto-created when `teacher` role user accepts invite
- Email FROM: `noreply@4dcs.co.za` (Resend, verified via `4dcs.co.za`)
- Waiver approval: bursar requests → principal email+bell → approve/reject → bursar email+bell

---

## 💰 Pricing Model (target)

| Market | Price | Notes |
|---|---|---|
| Lesotho | M500–M800/month | ~R375–R600 |
| South Africa | R800–R1,500/month | Cheaper than any alternative |

PRO features (locked): Exam Grades, Awards, Notes on learner profile

---

## 🚀 Onboarding a New School

1. School registers at `/register` → picks country → district
2. Admin creates grades → Settings → Grades & Classes
3. Admin creates fee plans → Settings → Fee Plans
4. Admin imports learners or adds manually
5. Admin invites staff → Settings → Staff Accounts (invite email sent automatically)
6. Teachers appear in Teachers tab automatically after accepting invite
7. Admin assigns classes to teachers → Settings → Teachers → + class
8. Fees auto-generate monthly — bursar just collects
9. Parent gets portal link from Learner → Overview tab
