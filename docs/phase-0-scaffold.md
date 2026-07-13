# Phase 0 — Scaffold (Handoff)

> เอกสารส่งต่อของ Phase 0 ตามกติกาใน CLAUDE.md ข้อ 13

## ทำอะไรไปแล้ว

วาง **โครง monorepo** และ **schema เริ่มต้น** ทั้งหมดให้พร้อมต่อยอด Phase 1+

### โครงสร้างที่สร้าง

```
.
├── apps/web/                       React + TypeScript + Vite (รันด้วย Bun) + Tailwind
│   ├── src/
│   │   ├── features/{entry,search,review,admin}/   หน้าจอหลัก 4 หน้า (placeholder)
│   │   ├── components/PlaceholderPage.tsx
│   │   ├── lib/supabase.ts          typed supabase client
│   │   ├── types/database.ts        generated types (placeholder)
│   │   ├── App.tsx / main.tsx / index.css
│   ├── package.json / tsconfig.json / vite.config.ts
│   ├── tailwind.config.ts / postcss.config.js / index.html
│   └── .env.example                 (VITE_SUPABASE_URL, ANON_KEY — client เท่านั้น)
├── supabase/
│   ├── config.toml
│   ├── migrations/
│   │   ├── 0001_init_schema.sql      ทุกตาราง + enum + index + trigger updated_at
│   │   ├── 0002_rls.sql             RLS + helper functions ตามบทบาท
│   │   └── 0003_seed_departments.sql seed 4 แผนก (housekeeping/dietary/nursing/other)
│   ├── functions/classify-preferences/  Edge Function stub (contract + validation)
│   └── .env.example                 (ANTHROPIC_API_KEY — server เท่านั้น)
├── packages/shared/                 types + constants ใช้ร่วม client/edge
├── docs/
├── package.json                     Bun workspaces + scripts รวม
├── tsconfig.base.json
├── .gitignore / README.md / CLAUDE.md
```

## การตัดสินใจสำคัญ

- **Bundler = Vite** (รันผ่าน Bun ตาม `bun run dev|build`) — เป็น setup React+TS ที่เสถียรที่สุด และ CLAUDE.md ข้อ 10 กำหนดแค่ให้ใช้ Bun เป็น runtime/สั่งรัน
- **RLS ใช้ helper function แบบ `security definer`** (`current_staff_role`, `is_reviewer`, `is_admin`, `is_active_staff`) เพื่อเลี่ยง recursive policy บนตาราง `staff` และอ่าน role ได้จากทุก policy
- **gate การมองเห็น** ทำที่ระดับ DB: `analysis_assignments`/`preference_analysis` ที่ `pending_review` อ่านได้เฉพาะ reviewer ส่วน `analysis_items.original_text` (free text ดิบ) เปิดให้ทุกบทบาท — ตรงตาม CLAUDE.md ข้อ 6/7.5
- **unique index `preference_analysis_one_current_idx`** บังคับให้มี analysis ที่ `is_current` ได้แค่หนึ่งต่อ HN
- **Edge Function เป็น stub** — วาง contract, dynamic-department prompt builder, และ `normalizeAssignments` (fallback `other`) ไว้แล้ว เว้นการเรียกโมเดลจริงไว้ Phase 2
- **แยก secret ชัดเจน**: client env ใส่ได้แค่ anon key; `ANTHROPIC_API_KEY` อยู่ใน `supabase/.env` เท่านั้น

## Schema / endpoint ที่เพิ่ม

- ตาราง: `staff`, `patients`, `admissions`, `departments`, `preference_analysis`, `analysis_items`, `analysis_assignments`, `audit_log`
- enum: `staff_role`, `admission_status`, `analysis_status`
- Edge Function: `POST /functions/v1/classify-preferences` (ปัจจุบันคืน `501 not_implemented`)

## วิธีรัน / ทดสอบ

```bash
bun install
cp apps/web/.env.example apps/web/.env      # ใส่ Supabase URL + anon key
cp supabase/.env.example supabase/.env       # ใส่ ANTHROPIC_API_KEY (Phase 2)

supabase start
supabase db reset                            # apply 0001–0003 + seed
bun run --cwd apps/web gen:types             # (แนะนำ) generate types จริงมาแทน placeholder

bun run dev                                   # เปิด http://localhost:5173
```

> ยังไม่ได้รัน `bun install` / `supabase start` ในเครื่อง scaffold นี้ (ไม่มี toolchain ในสภาพแวดล้อม) — เวอร์ชัน dependency ใน `package.json` ตั้งเป็น caret range พร้อมติดตั้ง

## งานที่เหลือ / ค้าง (ส่งต่อ Phase 1+)

- [ ] **Auth**: หน้า login + โหลด `staff` profile + route guard ตามบทบาท (Phase 0/1 boundary)
- [ ] **Phase 1**: CRUD `patients` + `admissions`, หน้ากรอกจริง, ค้นด้วย HN + auto-fill, แสดง free text
- [ ] **Phase 2**: เติมการเรียก Opus 4.8 ใน `classify-preferences`, auto-run หลังบันทึก, persist analysis, หน้าตั้งค่าหมวด (admin)
- [ ] **Phase 3**: คิวรอตรวจ, state machine + regenerate เด้งกลับ `pending_review`, gate การแสดง action
- [ ] **Phase 4**: audit_log triggers/writes, PDPA guards (เตือนคำที่อาจเป็นข้อมูลการแพทย์), edge cases
- [ ] generate `src/types/database.ts` จริง แล้วลบ placeholder

## คำถามที่ยังเปิดอยู่

ดู CLAUDE.md ข้อ 15 (admin แยกบทบาท / transport ของ Opus / ผู้อัปเดตห้อง / เก็บ version ความชอบ)
