# Skolo
**Less admin. More learning.**

School fees, communication, and events platform for schools in Lesotho and South Africa.

## Stack
- **Frontend:** React/Vite → Cloudflare Pages
- **Backend:** Express.js → Render
- **Database:** Supabase PostgreSQL
- **SMS:** Africa's Talking
- **Email:** Resend

## Structure
```
skolo/
├── backend/          # Express.js API
├── frontend/         # React/Vite PWA
└── supabase/
    └── migrations/   # SQL migration files
```

## Phase 1 Features
- Multi-school, multi-tenant architecture
- Country-aware (Lesotho + South Africa) — currency, regions, school IDs
- Learner and guardian registration
- Fee schedule management and payment recording
- Bursar reports — paid, outstanding, export to Excel
- School event calendar
- Bulk SMS announcements to parents
- Parent portal (secure link, no login required)

## Dev Setup
```bash
# Backend
cd backend && npm install && npm run dev

# Frontend
cd frontend && npm install && npm run dev
```
