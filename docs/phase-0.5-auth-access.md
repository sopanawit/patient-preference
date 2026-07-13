# Phase 0.5 — Auth + Access Control (Admin-first) (Handoff)

> เอกสารส่งต่อตามกติกา CLAUDE.md ข้อ 13

## ทำอะไรไปแล้ว

เพิ่ม auth layer + ระบบจัดการสิทธิ์ฝั่ง admin ครบวงจร (request → approve → revoke)
โดย **LINE login flow จริงยังไม่ทำ** — เก็บ config ไว้ให้เสียบเชื่อมภายหลัง

### Backend (Supabase)
- `supabase/migrations/0004_access_control.sql`:
  - enum `request_status` (`pending`/`approved`/`rejected`)
  - ตาราง `access_requests` (คิวคำขอ — ไม่ผูก `auth.users`)
  - ALTER `staff`: เพิ่ม `line_user_id` (unique), `department_id` (FK `departments`)
  - ตาราง `app_settings` (key/value) — เก็บ `line_liff_id`, `line_channel_id`, `line_channel_secret`
  - RLS: `access_requests`/`app_settings` admin-only ; `audit_log` insert-self สำหรับ active staff
- `supabase/seed.sql`: ตัวอย่างคำขอ pending 3 รายการ (local) + SQL bootstrap admin (comment ไว้)
- `supabase/config.toml`: เปิด `[db.seed]`

### Frontend (apps/web)
- `src/lib/auth.tsx` — `AuthProvider` + `useAuth()` (session + staff profile + loading)
- `src/lib/audit.ts` — `recordAudit()` helper
- `src/features/auth/LoginPage.tsx` — login email/password
- `src/components/RequireAuth.tsx` — guard: login + active (มีจอ "รออนุมัติ"/"ถูกระงับ")
- `src/components/RequireRole.tsx` — guard ระดับ role (มีจอ 403)
- `src/features/dashboard/DashboardPage.tsx` — การ์ดสรุปภาพรวม
- `src/features/admin/access/AccessRequestsPage.tsx` — อนุมัติ/ปฏิเสธคำขอ + ระงับ/คืนสิทธิ์ + เปลี่ยน role
- `src/features/admin/LineSettingsPage.tsx` — ฟอร์ม LINE config
- `src/features/admin/AdminPage.tsx` — เมนูรวมหน้า admin
- `src/App.tsx` — routes + nav ตาม role + guard, default → `/dashboard`
- `src/types/database.ts` — **เขียนด้วยมือ** ให้ตรง schema 0001–0004 (ยังไม่มี Supabase CLI generate)

## การตัดสินใจสำคัญ

- **แยก `access_requests` (คิว) ออกจาก `staff` (บัญชีจริง)** — จัดการ/ทดสอบ admin UI ได้โดยไม่ต้องมี auth user ของผู้ขอ; staff จะ materialize ตอน LINE login จริง
- **revoke = `staff.is_active=false`** ใช้คอลัมน์เดิม ไม่เพิ่ม enum — RLS helper `is_active_staff()` เดิมใช้ได้ทันที
- **role กำหนดโดย admin ตอน approve** (LINE user เป็นได้แค่ cs/nurse/cx_manager)
- **staff.department ใช้ตาราง `departments` เดิมซ้ำ** (ตามที่ผู้ใช้เลือก)
- **LINE config เก็บใน `app_settings`** (admin แก้ได้) — secret มีคอมเมนต์เตือนให้ย้ายไป Edge env ใน production

## วิธีรัน / ทดสอบ

```bash
bun install
# ต้องมี Supabase CLI (ยังไม่ได้ติดตั้งในสภาพแวดล้อม scaffold นี้)
supabase start
supabase db reset               # apply 0001–0004 + seed (มีคำขอ pending ตัวอย่าง)

# bootstrap admin:
#   1) สร้าง auth user ใน Supabase Studio ด้วย email ที่ต้องการ
#   2) แก้ email ใน supabase/seed.sql (บล็อก bootstrap) แล้ว uncomment
#   3) supabase db reset อีกครั้ง (หรือรัน insert นั้นด้วยมือ)

bun run --cwd apps/web gen:types   # generate types จริงทับ database.ts (แนะนำ)
cp apps/web/.env.example apps/web/.env   # ใส่ VITE_SUPABASE_URL + anon key
bun run dev                        # http://localhost:5173
```

### ผลการตรวจในสภาพแวดล้อมนี้
- ✅ `bun install`, `bun run typecheck`, `bun run build` ผ่าน (93 modules)
- ⚠️ **ยังไม่ได้รัน DB/e2e จริง** เพราะสภาพแวดล้อมนี้ไม่มี Supabase CLI + Postgres —
  ต้องรัน `supabase start` + `db reset` แล้วทดสอบ login/approve/revoke ในเครื่องที่มี CLI

## งานที่เหลือ / ค้าง

- [ ] **ทดสอบ DB e2e จริง**: `supabase db reset` → login admin → approve/reject/revoke → ตรวจ audit_log
- [ ] **generate `database.ts` จริง** ด้วย `gen:types` แทนที่ตัว hand-written
- [ ] **LINE login flow (เฟสถัดไป):**
  - LIFF frontend + `liff.getIDToken()`
  - Edge Function `line-auth`: verify LINE ID token (ใช้ค่าจาก `app_settings`) → find/create auth user by `line_user_id` → materialize `staff` จาก `access_requests` ที่ approved → mint Supabase session
  - หน้า request-access ใน LIFF (กรอกชื่อ+แผนก → insert `access_requests` ผ่าน service role)
- [ ] Phase 1 CRUD (patients/admissions), Phase 2 AI ตามแผนเดิม
