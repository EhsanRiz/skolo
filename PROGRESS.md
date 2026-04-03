# Skolo — Development Progress
*Last updated: 3 April 2026*

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

---

## 🔑 Environment Variables

### Render (Backend)
```
SUPABASE_URL=https://sxhjsmajoetvdgrpuawa.supabase.co
SUPABASE_SERVICE_KEY=<service role key>
JWT_SECRET=<jwt secret>
FRONTEND_URL=https://skolo.pages.dev
PORT=3001
```

### Cloudflare Pages (Frontend)
```
VITE_API_URL=https://skolo-api.onrender.com
```

---

## 👤 User Roles

| Role | Access |
|---|---|
| admin | Full access — all settings, all data |
| bursar | Fee management, learner records, payments |
| principal | View-only dashboards + reports |

**JWT keys in localStorage:**
- `sk_token` — JWT bearer token
- `sk_user`  — user object (id, school_id, role, email, full_name)

---

## 📁 Project Structure

```
skolo/
├── backend/
│   ├── server.js
│   ├── lib/
│   │   ├── supabase.js
│   │   └── sequences.js        # Reference number generator
│   ├── middleware/
│   │   └── auth.js
│   └── routes/
│       ├── auth.js             # Login + school registration
│       ├── schools.js          # School config, countries, regions, PATCH /me
│       ├── learners.js         # CRUD + bulk import + /bulk
│       ├── grades.js           # Grades + classes CRUD
│       ├── fees.js             # Old fee schedules + arrears (legacy)
│       ├── fee-plans.js        # Fee plans per grade
│       ├── fee-ledger.js       # Smart ledger: generate, pay, summary
│       ├── events.js           # School calendar
│       ├── announcements.js    # Bulk SMS + announcements
│       ├── teachers.js         # Teacher management
│       ├── users.js            # Staff account management
│       ├── upload.js           # Logo upload → Supabase Storage
│       ├── receipts.js         # PDF receipt generation (pdfkit)
│       └── portal.js           # Parent portal (public, token-secured)
└── frontend/src/
    ├── App.jsx                 # Routes + ProtectedRoute
    ├── contexts/
    │   ├── AuthContext.jsx     # useAuth() — login, logout, school config
    │   └── ToastContext.jsx    # useToast() — success/error/warning/info
    ├── components/
    │   ├── Layout.jsx          # Dark navy sidebar, topbar
    │   └── ui.jsx              # Shared icons, badges, ActionBtn, t (design tokens)
    └── pages/
        ├── Login.jsx           # Blue chalkboard with physics formulas
        ├── Register.jsx        # School registration (country → region cascade)
        ├── Dashboard.jsx       # Stats cards (clickable), arrears, events
        ├── Learners.jsx        # Table + add/view/edit modals + bulk import + portal link
        ├── Fees.jsx            # Bursar-first ledger: search, grade groups, pay, receipt
        ├── Events.jsx          # School calendar cards
        ├── Announcements.jsx   # Announcements + SMS toggle
        ├── Settings.jsx        # Grades, fee plans, teachers, profile, staff
        └── ParentPortal.jsx    # Public parent fee portal (no login)
```

---

## ✅ Completed Features

### Core
- [x] Multi-school, multi-tenant architecture (school_id on every table, RLS)
- [x] Country-aware: Lesotho (LSL, M) + South Africa (ZAR, R)
- [x] School registration → admin account created in one flow
- [x] JWT auth + role-based access (admin/bursar/principal)

### Learners
- [x] CRUD with guardian linkage (one learner → many guardians)
- [x] Bulk import from CSV or Excel (template downloadable)
- [x] Unique reference numbers: `00001`–`99999` per school
- [x] View modal with parent portal link generation
- [x] Search by name

### Fee System
- [x] Fee Plans (monthly/termly, per grade)
- [x] Ledger generation (per month or per term, idempotent)
- [x] Bursar view: search, grade-grouped, collapsible, status pills
- [x] Pay (full or partial), auto-status update
- [x] PDF receipt auto-download after payment
- [x] Receipt button on any paid/partial row
- [x] Export to Excel (filtered month)
- [x] Monthly totals bar (Due/Collected/Outstanding/Rate)

### Settings
- [x] Grades & Classes — add standard grades R–12, add class letters A/B/C
- [x] Fee Plans — create, activate/pause, delete
- [x] Teachers — add with name/email/phone/subject + T-0001 IDs
- [x] School Profile — edit + logo upload (requires school-logos bucket)
- [x] Staff Accounts — add/edit/disable/enable (cannot disable self)

### Events & Communication
- [x] School calendar (academic/sports/meeting/holiday/general)
- [x] Announcements with SMS queue (Africa's Talking integration pending)

### Parent Portal
- [x] Token-based secure link (no login required)
- [x] Shows: guardian name, all children, fee summary, recent history
- [x] Generated from Learner → View modal

### Dashboard
- [x] Clickable stat cards (Total learners → drawer, Outstanding → modal, etc.)
- [x] Arrears snapshot, upcoming events

### Infrastructure
- [x] Toast notifications (success/error/warning/info)
- [x] PDF receipts (pdfkit)
- [x] Supabase Storage for logos (bucket: school-logos, must be public)

---

## 🔲 Still To Do

### Next
- [ ] Mobile responsive sidebar (hamburger menu for phone use)
- [ ] Bulk SMS via Africa's Talking (LS support pending)
- [ ] Bank reconciliation — upload statement, match by reference no (paid feature)
- [ ] Parent portal: send link via SMS

### Phase 2
- [ ] Attendance tracking
- [ ] Parent-teacher direct messaging
- [ ] Read receipts on announcements

### Phase 3
- [ ] Digital assignments
- [ ] Results and report cards
- [ ] AI homework assistant

---

## 🗄️ Database Migrations (run in order in Supabase SQL Editor)

| File | Description | Status |
|---|---|---|
| `001_initial_schema.sql` | All core tables + RLS + seed data | ✅ Run |
| `002_rls_policies.sql` | RLS policies (service role bypass) | ✅ Run |
| `003_logo_url.sql` | Add logo_url to schools | ✅ Run |
| `004_fee_ledger.sql` | fee_plans, fee_ledger, teachers | ✅ Run |
| `005_reference_numbers.sql` | reference_no for learners + teachers, backfill | ✅ Run |
| `006_portal_tokens.sql` | portal_token for guardians, backfill | ⏳ Run next |

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
- `sk_token` is the localStorage JWT key — all auth code must use this exact key
- CORS allows all `*.skolo.pages.dev` subdomains + localhost
- Supabase service role key bypasses RLS — all backend ops use this
- Logo upload requires `school-logos` bucket to exist in Supabase Storage (public)
- Reference numbers are school-scoped and sequential — tracked in `school_sequences` table
- Portal links use 48-char hex tokens stored in `guardians.portal_token`

---

## 💰 Pricing Model (target)

| Market | Price | Notes |
|---|---|---|
| Lesotho | M500–M800/month | ~R375–R600 |
| South Africa | R800–R1,500/month | Cheaper than any alternative |

---

## 🚀 Deployment Steps (new school)

1. School registers at `/register` → picks country → district/province
2. Admin creates grades in Settings → Grades & Classes
3. Admin creates fee plans in Settings → Fee Plans
4. Admin imports learners via CSV/Excel or adds manually
5. Each month: Fees → Generate fees → Bursar collects
6. Guardian gets portal link from Learner view → sees balance on phone
