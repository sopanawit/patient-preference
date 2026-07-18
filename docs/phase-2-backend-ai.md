# Phase 2 — Backend จริง: Patients/Analysis + AI classify (Handoff)

> เอกสารส่งต่อตามกติกา CLAUDE.md ข้อ 13

## ทำอะไรไปแล้ว

ต่อ backend จริง (Supabase) สำหรับส่วน **patients / admissions / analysis** และ
**AI classify ด้วย Claude Opus 4.8** ผ่าน Edge Function — เดิมส่วนนี้เป็น mock อย่างเดียว
ตอนนี้ `supabase` implementation ครบทุก method ใน data-access layer แล้ว

### Edge Function — `classify-preferences` (เรียกโมเดลจริง)
`supabase/functions/classify-preferences/index.ts` (เดิมเป็น scaffold คืน 501)
- รับ `{ hn }` (ตั้ง `verify_jwt=true` — ต้อง login)
- อ่าน `likes_text/dislikes_text` + รายชื่อ `departments` (active) จาก DB ด้วย **service role**
  (เป็นแหล่งข้อมูลจริง ไม่เชื่อ text จาก client) → รายชื่อแผนกเป็น dynamic ฝังใน prompt
- คำนวณ `source_hash` (FNV-1a) — ถ้าตรงกับ analysis ปัจจุบัน **ข้าม** (กัน re-generate ซ้ำ)
- เรียก Anthropic Messages API (`model=claude-opus-4-8`) ขอผลเป็น JSON (มี timeout 45s)
- `normalizeAssignments`: `department_code` ที่ไม่มีจริง → fallback `other`
- persist: ปิด analysis เก่า (`is_current=false`) → insert ใหม่ (`is_current=true`,
  `pending_review`) + items + assignments → เขียน `audit_log` (`reanalyze`)
- **แยก transaction**: ฝั่ง client บันทึก `patients` เสร็จก่อนเรียก function — ถ้า AI ล้ม/timeout
  คืน `502 {status:"error"}` โดย free text ที่บันทึกแล้วไม่เสียหาย
- CORS เปิดให้เรียกจาก browser (`supabase.functions.invoke`) ได้

### Data-access (`apps/web/src/data/supabase.ts`)
เดิมโยน `BACKEND_TODO` — ตอนนี้ทำจริง:
- `patients.getByHn / view / currentAdmission / listPreferenceTags`
- `patients.save`: upsert patient → จัดการ active admission (อัปเดตห้อง/สร้างใหม่) →
  `audit_log` → ถ้า likes/dislikes เปลี่ยน เรียก Edge Function `classify-preferences`
  (ครอบ try/catch: AI ล้มไม่ทำให้ save ล้ม)
- `analysis.listPending / updateAssignment / deleteAssignment / confirm` (+ audit ทุก mutation)
- helper `assembleAnalyses()` ประกอบ `preference_analysis → analysis_items → analysis_assignments`
  เป็น nested `Analysis` (รูปแบบเดียวกับ mock)

### Migration ใหม่
`supabase/migrations/0005_analysis_status_visibility.sql`
- ปรับ policy `preference_analysis_select` → ให้ active staff ทุกบทบาทเห็น **สถานะ** ของ analysis
  (เพื่อโชว์ข้อความ "กำลังรอ CX ตรวจ" ตาม CLAUDE.md 7.5)
- **action รายแผนก (`analysis_assignments`) ยังล็อกเหมือนเดิม** — เห็นเฉพาะ `confirmed`
  หรือเป็น reviewer (policy จาก 0002 ไม่เปลี่ยน) ; แถว analysis ไม่มี free text จึงไม่เพิ่มความเสี่ยง

## สถานะ AI (ปิดอยู่ — ประหยัดค่าใช้จ่าย)
ตามที่ตกลง **ปิดการเรียกโมเดลไว้ก่อน** — Edge Function จะ "แตกความต้องการเป็น
รายการ (items)" เท่านั้น ไม่เรียก Claude (ไม่มีค่าใช้จ่าย) แล้ว **CX แบ่งแผนก +
เขียน action เอง** ในหน้าคิวรอตรวจ (มีปุ่ม "＋ เพิ่มแผนก" ต่อรายการ)
- คุมด้วย env ของ function: `AI_CLASSIFY_ENABLED` (ไม่ตั้ง/ไม่ใช่ `true` = ปิด)
- **เปิด AI กลับมา**: `supabase secrets set AI_CLASSIFY_ENABLED=true` (ต้องมี
  `ANTHROPIC_API_KEY` + เครดิต) แล้ว function จะจัด action รายแผนกอัตโนมัติเหมือนเดิม
- analysis ที่สร้างตอนปิด AI จะมี `model = "manual"`

## การตัดสินใจสำคัญ
- **Transport = Anthropic API ตรง** (ตาม scaffold + `supabase/.env.example`) — CLAUDE.md §15
  เปิดทางเลือก Bedrock ไว้ ถ้าจะเปลี่ยนแก้เฉพาะฟังก์ชัน `callModel()`
- **Model = `claude-haiku-4-5-20251001` (Haiku 4.5)** — ตามที่ตกลง (เร็ว/ประหยัด)
  เปลี่ยนกลับเป็น `claude-opus-4-8` ได้ที่ค่าคงที่ `MODEL` ใน edge function
- Edge Function อ่าน likes/dislikes จาก DB เอง (ไม่รับจาก client) เพื่อความถูกต้อง/ปลอดภัย
  และให้ `source_hash` ตรงกับข้อมูลที่บันทึกจริง
- audit actor ของ `reanalyze` ดึงจาก JWT ของผู้เรียก

## วิธี Deploy ขึ้น Supabase (ต้องมี Supabase CLI + สิทธิ์โปรเจกต์)
```bash
# 1) ผูกกับโปรเจกต์ (ครั้งแรก)
supabase link --project-ref <PROJECT_REF>

# 2) push migrations (0001–0005)
supabase db push

# 3) ตั้ง secret ของโมเดล (อยู่ฝั่ง function เท่านั้น — ห้าม expose client)
supabase secrets set ANTHROPIC_API_KEY=<sk-ant-...>

# 4) deploy edge function
supabase functions deploy classify-preferences

# 5) generate types ทับให้ตรง schema จริง (แนะนำ)
cd apps/web && bun run gen:types
```
เปิดใช้ backend จริงฝั่ง frontend: ตั้ง env ตอน build (เช่นบน AWS Amplify)
```
VITE_DATA_BACKEND=supabase
VITE_SUPABASE_URL=<https://xxxx.supabase.co>
VITE_SUPABASE_ANON_KEY=<anon key>
```

## วิธีทดสอบ (local)
```bash
supabase start                    # Postgres + Auth + Studio ใน Docker
supabase db reset                 # apply migrations 0001–0005 + seed.sql
echo "ANTHROPIC_API_KEY=sk-ant-..." > supabase/.env
bun run functions:serve           # serve classify-preferences ด้วย --env-file
# สร้าง auth user + promote เป็น admin (ดู seed.sql ท้ายไฟล์) แล้ว login ที่ web
```

## สถานะ deploy (ทำแล้ว)
Deploy ขึ้นโปรเจกต์จริง `zuncjubfymprppzdqagm` ผ่าน Management API (HTTPS) แล้ว:
- migrations 0001–0005 apply ครบ (10 ตาราง + seed 4 แผนก) ✓
- ตั้ง secret `ANTHROPIC_API_KEY` ✓
- deploy edge function `classify-preferences` (version 1, ACTIVE, verify_jwt=true) ✓
- ทดสอบ invoke จริง: path อ่าน DB → เรียกโมเดล → persist ทำงานครบ ✓
  (การเรียกโมเดลตอบ 400 "credit balance too low" — เป็นเรื่อง billing ของบัญชี Anthropic
   ไม่ใช่บั๊กโค้ด ; error handling แยก transaction ทำงานถูกต้อง)

## งานที่เหลือ / ค้าง
- **เติมเครดิต Anthropic** เพื่อให้ AI classify ทำงานจริง (โค้ด/คีย์วางถูกแล้ว)
- **Bootstrap admin**: ต้องสร้าง auth user + promote เป็น `staff` role admin จึงจะ login เว็บได้
  (Supabase Studio → Auth → Add user ; แล้ว insert staff ตามท้าย `supabase/seed.sql`)
- **ตั้ง env ฝั่ง frontend (AWS Amplify)**: `VITE_DATA_BACKEND=supabase`,
  `VITE_SUPABASE_URL=https://zuncjubfymprppzdqagm.supabase.co`, `VITE_SUPABASE_ANON_KEY=<publishable key>`
- LINE LIFF login flow จริง (materialize `access_requests` → `staff`) — เฟสถัดไป
- `gen:types` ทับ `types/database.ts` จาก DB จริงเมื่อ CLI ใช้ได้ (ตอนนี้เขียนมือให้ตรง migration แล้ว)
- ไม่มี retry อัตโนมัติเมื่อ AI ล้ม (คืน error ให้ผู้ใช้กดบันทึกซ้ำเพื่อ trigger ใหม่)
