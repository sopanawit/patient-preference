# Phase 3 (addendum) — Partial Review (ตรวจเฉพาะความชอบใหม่)

## ปัญหาเดิม
เมื่อคนไข้มี analysis ที่ CX ตรวจ `confirmed` แล้ว แต่มีการ **กรอกความชอบใหม่เพิ่ม**
ระบบเดิมจะ regenerate analysis ทั้งก้อนแล้วเด้งกลับ `pending_review` → CX ต้องมา
**ตรวจซ้ำทั้งหมด** ทั้งที่รายการเดิมตรวจไปแล้ว

## สิ่งที่ทำ
เปลี่ยนสถานะการตรวจจาก "ระดับ analysis" เป็น **"ระดับรายการ" (per-item)**:
- เพิ่มความชอบใหม่ → เกิด `analysis_items` ใหม่สถานะ `pending_review` เฉพาะอันนั้น
- รายการเดิมที่ `confirmed` แล้ว **คงสถานะและ assignment ไว้** — CX ไม่ต้องตรวจซ้ำ
  และหน้าคนไข้ **ยังแสดง action เดิมได้ต่อเนื่อง**
- ลบความชอบออกจาก free text → item นั้นหายไป (พร้อม assignment)
- CX กด "ยืนยันรายการใหม่" → ยืนยันเฉพาะ item ที่ `pending_review`

`preference_analysis.status` กลายเป็น **aggregate**: มี item ใด `pending_review`
→ analysis เป็น `pending_review`, ไม่งั้น `confirmed` (ใช้ต่อกับ dashboard/คิวรอตรวจได้เลย)

## การจับคู่รายการ (reconcile)
เทียบ free text ใหม่กับรายการเดิมด้วยคีย์ `source + ข้อความ (trim + lowercase)`:
รายการที่ยังมีอยู่ = ใช้ของเดิม (status + assignments), รายการใหม่ = สร้างใหม่ pending

## Schema / Types
- Migration ใหม่: `supabase/migrations/0007_analysis_item_status.sql`
  - `alter table analysis_items add column status analysis_status not null default 'pending_review'`
  - backfill จากสถานะ analysis เดิม + index `(analysis_id, status)`
- `apps/web/src/types/database.ts` — เพิ่ม `status` ใน `analysis_items` Row/Insert/Update
- `apps/web/src/data/model.ts` — `AnalysisItem.status`; `Analysis.status` เป็น aggregate

## โค้ดที่แก้
- `apps/web/src/data/mock.ts` — `reconcileItems()`, `deriveStatus()`, `save()` (reconcile
  แทน regenerate), `confirm()` (ยืนยันเฉพาะ pending), `listPending()` (item-based), seed
- `apps/web/src/data/supabase.ts` — `assembleAnalyses()` ใส่ `status` ให้ item
  (ยังอิงสถานะ analysis ชั่วคราว — ดู "งานที่เหลือ")
- `apps/web/src/features/review/ReviewPage.tsx` — แยก pending (แก้ได้) กับ confirmed
  (แสดงอ้างอิงแบบ read-only, พับเก็บได้) ; ปุ่ม "ยืนยันรายการใหม่"
- `apps/web/src/features/patient/PatientDetail.tsx` — แสดง action จาก item ที่
  `confirmed` แม้จะมี item ใหม่รอตรวจ + ป้ายบอกจำนวนรายการใหม่ที่รอตรวจ

## วิธีทดสอบ (mock, ค่าเริ่มต้น)
1. `bun install && bun run dev` (ใน `apps/web`)
2. ค้น HN0001 (มี analysis confirmed อยู่แล้ว) → หน้าคนไข้เห็น action ครบ
3. หน้ากรอกข้อมูล: ค้น HN0001 → เพิ่ม tag ความชอบใหม่ 1 อัน → บันทึก
4. คิวรอตรวจ (login CX: `cx@hospital.local`): เห็น HN0001 โผล่ — มีเฉพาะรายการใหม่
   ให้แก้ ส่วนรายการเดิมอยู่ในกล่อง "ยืนยันแล้ว … (ไม่ต้องตรวจซ้ำ)"
5. หน้าคนไข้ HN0001 ระหว่างนี้: ยังเห็น action เดิม + ป้าย "มีความต้องการใหม่ … รอ CX ตรวจ"
6. CX แบ่งแผนกให้รายการใหม่ → "ยืนยันรายการใหม่" → หน้าคนไข้แสดง action เพิ่ม

## งานที่เหลือ / ค้าง (backend phase)
Edge Function `classify-preferences` **ยังทำ full-regenerate** (สร้าง analysis ใหม่ ปิดตัวเก่า)
ต้องปรับให้ reconcile กับ analysis ปัจจุบัน:
- เก็บ item เดิม (จับคู่ด้วย source+original_text) พร้อมสถานะ+assignment
- insert เฉพาะ item ใหม่ (`status='pending_review'`), ลบ item ที่หายไป
- ไม่ต้องปิด/สร้าง `preference_analysis` ใหม่ทุกครั้ง (คง current เดิม อัปเดต generated_at)
- RLS ของ `analysis_items.status` (update เฉพาะ cx_manager/admin) — ตรวจ policy เพิ่มเมื่อทำ backend
ปัจจุบัน `supabase.ts` จึงยัง map สถานะ item = สถานะ analysis (all-or-nothing) จนกว่าจะทำข้างต้น
