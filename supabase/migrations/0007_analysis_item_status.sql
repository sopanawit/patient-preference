-- ============================================================================
-- Partial review: เพิ่มสถานะการตรวจ "ระดับรายการ" ให้ analysis_items
--
-- เหตุผล (CLAUDE.md 7.4): เดิมเมื่อคนไข้มีความชอบใหม่เพิ่ม ระบบ regenerate analysis
-- ทั้งก้อนแล้วเด้งกลับ pending_review → CX ต้องตรวจซ้ำทั้งหมด ทั้งที่รายการเดิมตรวจแล้ว
-- ปรับเป็น partial review: เก็บสถานะตรวจรายรายการ — เพิ่มความชอบใหม่ = เพิ่ม item ใหม่
-- สถานะ pending_review เฉพาะอันนั้น ส่วนรายการเดิมที่ confirmed แล้วคงไว้ ไม่ต้องตรวจซ้ำ
--
-- สถานะรวมของ preference_analysis ยังคงอยู่ (ใช้เป็น aggregate):
--   มี item ใด pending_review → analysis เป็น pending_review, ไม่งั้น confirmed
-- ============================================================================

alter table analysis_items
  add column status analysis_status not null default 'pending_review';

-- backfill: รายการเดิมยึดตามสถานะของ analysis ที่สังกัด (ก่อนมีคอลัมน์นี้)
update analysis_items ai
set status = pa.status
from preference_analysis pa
where ai.analysis_id = pa.id;

create index analysis_items_status_idx on analysis_items (analysis_id, status);
