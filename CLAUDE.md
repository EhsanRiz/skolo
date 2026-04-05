# Skolo — AI-Powered School Management Platform

> **One Platform. Whole School.**
> Built for schools in Lesotho and South Africa.

## Quick Start

```bash
# Frontend (React/Vite PWA)
cd frontend && npm install && npm run dev    # http://localhost:5173

# Backend (Express.js)
cd backend && npm install && npm run dev     # http://localhost:3001
```

Both require `.env` files — see `.env.example` in each directory.

## Live URLs

| Service | URL |
|---------|-----|
| Frontend | https://myskolo.co.za (Cloudflare Pages) |
| Backend API | https://skolo-api.onrender.com (Render) |
| Database | Supabase PostgreSQL |
| Email | Resend (from: noreply@4dcs.co.za) |

## Tech Stack

- **Frontend:** React 18 + Vite + PWA (vite-plugin-pwa), React Router, Recharts, Axios
- **Backend:** Express.js, JWT auth (7-day expiry), bcryptjs, pdfkit (report cards)
- **Database:** Supabase PostgreSQL with RLS (multi-tenant, school_id isolation)
- **Deployment:** Cloudflare Pages (frontend auto-deploy), Render (backend auto-deploy)
- **Email:** Resend API for invites, password resets, waiver notifications, demo requests

## Architecture

### Multi-Tenancy
- Every table filtered by `school_id` (UUID)
- RLS enforced at database level
- Backend uses Supabase service role key (bypasses RLS)
- JWT contains user_id, school_id, role

### User Roles & Access
| Role | Access |
|------|--------|
| `admin` | Full access — settings, users, learners, fees, grades, attendance |
| `principal` | Read-only dashboards + waiver approvals + attendance alerts |
| `bursar` | Fees + learners management |
| `teacher` | My Classes, Exam Grades, Attendance only |

### Auth Flow
1. Register school → creates school + first admin user
2. Login → JWT (stored as `sk_token` in localStorage)
3. Staff invited by admin (no password) → invite email → set-password page
4. Password reset via email token

## Project Structure

```
skolo/
├── backend/
│   ├── server.js              # Express entry (port 3001)
│   ├── lib/                   # Supabase client, email, auto-fee generation
│   ├── middleware/             # JWT auth, super-admin auth
│   └── routes/                # 26 route files (see below)
├── frontend/
│   ├── src/
│   │   ├── App.jsx            # Routes + ProtectedRoute wrapper
│   │   ├── contexts/          # AuthContext, ToastContext
│   │   ├── components/        # Layout (sidebar + mobile nav), UI components
│   │   ├── pages/             # 21 page components
│   │   └── lib/api.js         # Axios instance with JWT interceptor
│   ├── public/                # PWA icons, skolo-promo.mp4
│   └── vite.config.js         # React + PWA config
├── supabase/migrations/       # 17 SQL migration files
├── PROGRESS.md                # Detailed dev notes
└── CLAUDE.md                  # This file
```

## API Endpoints (Key Routes)

### Auth
- `POST /auth/register-school` — School + admin creation
- `POST /auth/login` — Email/password → JWT
- `POST /auth/forgot-password` / `POST /auth/reset-password`

### Learners
- `GET/POST/PATCH/DELETE /learners` — CRUD + bulk CSV import
- `GET /learner-profile/:id` — Exam results, awards, medical, notes

### Fee Management (Smart Ledger)
- `GET /fee-ledger` — Filterable ledger (status, month, grade, learner)
- `GET /fee-ledger/summary` — Year totals (due, paid, waived, outstanding)
- `POST /fee-ledger/pay` — Record payment
- `POST /fee-ledger/waive` — Request waiver (needs principal approval)
- `POST /fee-ledger/auto-generate` — Idempotent monthly fee generation
- `GET/POST/PATCH/DELETE /fee-plans` — Fee plan CRUD

### Academics
- `GET/POST /exam-grades` — Bulk upsert by class/subject/term
- `GET/POST /attendance` — Daily register
- `GET /attendance/monthly-summary` — Monthly stats
- `GET/POST/PATCH/DELETE /grades` — Grade structure (R–12)
- `GET/POST/PATCH/DELETE /classes` — Class letters (A, B, C)

### Communication
- `GET/POST/DELETE /announcements` — With optional SMS blast
- `GET/POST/PATCH/DELETE /events` — School calendar
- `GET /notifications` — Bell notifications (waiver requests, payments)

### Staff & School
- `GET/POST/PATCH/DELETE /users` — Staff accounts with invite flow
- `GET/PATCH /schools/me` — School profile + config
- `GET/POST/PATCH/DELETE /teachers` — Teacher records
- `GET/POST/DELETE /teacher-classes` — Teacher-class assignments

### Other
- `GET /portal/:token` — Public parent portal (no auth, token-secured)
- `POST /waivers/request` + `POST /waivers/:id/approve|reject`
- `POST /report-cards` — PDF generation
- `POST /demo-requests` — Landing page demo form
- `GET /super-admin/overview` — Platform-wide metrics

## Frontend Pages

### Public
- `/` — LandingPage (marketing site with promo video)
- `/login`, `/register`, `/forgot-password`, `/reset-password/:token`
- `/parent/:token` — Parent portal (public, read-only fee view)
- `/request-demo` — Demo request form

### Protected (role-based sidebar nav)
- `/dashboard` — Role-specific KPI cards + charts
- `/learners` + `/learners/:id` — List + profile
- `/fees` — Smart ledger with filters (Unpaid/Overdue/Partial/Paid)
- `/waivers` — Request/approve/reject workflow
- `/my-classes` — Teacher's assigned classes (teacher only)
- `/exam-grades` — Grade entry by class/subject/term
- `/attendance` — Daily register + monthly summary
- `/events` — School calendar
- `/announcements` — Compose + SMS blast
- `/settings` — Grades, classes, fee plans, timetable, grade scale, school profile, staff (admin only)

## Database Tables (Key)

- `schools` — Tenant anchor (UUID PK, country_id, currency)
- `users` — Staff per school (role: admin/principal/bursar/teacher)
- `learners` — Student records with auto-generated reference numbers
- `guardians` + `learner_guardians` — Parent/guardian links
- `grades` + `classes` — Academic structure (Grade R–12, classes A/B/C)
- `teachers` + `teacher_classes` — Teacher-class assignments
- `fee_plans` — Monthly/termly fee templates
- `fee_ledger` — Smart ledger (auto-status: pending/partial/paid/overdue/waived)
- `exam_grades` — Marks by class/subject/term (T1–T4)
- `attendance` — Daily register (present/absent/excused/late)
- `announcements` + `events` — Communications
- `notifications` — Bell notifications
- `waivers` — Fee waiver workflow (request → approve/reject)
- `activity_log` — Audit trail
- `sms_log` — SMS delivery tracking

## Currencies & Localisation

- **Lesotho:** Maloti (M / LSL), phone prefix +266
- **South Africa:** Rand (R / ZAR), phone prefix +27
- Subjects: Afrikaans, Mathematics, Sesotho, English, etc.
- Grade scale: Configurable per school (grade_boundaries JSONB)
- Terms: T1, T2, T3, T4

## Business Logic Notes

### Fee Auto-Generation
- When a learner is enrolled, monthly fees auto-generate up to current month
- `POST /fee-ledger/auto-generate` is idempotent (safe to call repeatedly)
- Status computed live: checks due_date vs today, payments vs amount_due

### Waiver Workflow
1. Bursar requests waiver → email sent to principal
2. Principal approves/rejects from dashboard
3. Approved → ledger updated + notification created

### Parent Portal
- Admin generates public link for guardian (hex token)
- No login required — guardian sees linked learners + fee summary
- Read-only, current year only

## Environment Variables

### Backend (.env)
```
SUPABASE_URL=https://sxhjsmajoetvdgrpuawa.supabase.co
SUPABASE_SERVICE_KEY=<service-role-key>
JWT_SECRET=<jwt-secret>
PORT=3001
FRONTEND_URL=https://myskolo.co.za
RESEND_API_KEY=<resend-api-key>
```

### Frontend (.env)
```
VITE_API_URL=https://skolo-api.onrender.com
```

## Deployment

### Push to deploy (both auto-deploy from GitHub main branch):
```bash
git add -A && git commit -m "description" && git push origin main
```
- Frontend builds on Cloudflare Pages (`npm run build` → `frontend/dist`)
- Backend deploys on Render (`node server.js`)
- Render free tier: ~30s cold start after inactivity

## Conventions

- All IDs are UUIDs
- Dates stored as ISO timestamps (TIMESTAMPTZ)
- Fee amounts as NUMERIC(10,2)
- API responses: `{ data }` on success, `{ error }` on failure
- Frontend state: AuthContext (user/school), ToastContext (notifications)
- Token storage: `sk_token` (JWT), `sk_user` (user JSON) in localStorage
- Sidebar navigation is role-based (defined in Layout.jsx)
