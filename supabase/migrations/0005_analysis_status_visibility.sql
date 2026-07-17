-- ============================================================================
-- ปรับ RLS: ให้เจ้าหน้าที่ที่ active ทุกบทบาทเห็น "สถานะ" ของ preference_analysis
-- (metadata: status / generated_at) แม้ยัง pending_review
--
-- เหตุผล (CLAUDE.md 7.5): ระหว่างรอ CX ตรวจ CS/Nurse ต้องรู้ว่า "กำลังรอตรวจ"
-- เพื่อแสดงข้อความให้ถูก — แต่ action รายแผนก (analysis_assignments) ยังคงถูกล็อก
-- ให้เห็นเฉพาะเมื่อ confirmed หรือเป็น reviewer เท่านั้น (policy เดิมจาก 0002 ไม่เปลี่ยน)
--
-- หมายเหตุ: แถวนี้ไม่มี free text — original_text อยู่ที่ analysis_items ซึ่งเปิดให้
-- active staff อ่านได้อยู่แล้ว (0002) ; การเปิด metadata ระดับนี้จึงไม่เพิ่มความเสี่ยง
-- ============================================================================

drop policy if exists preference_analysis_select on preference_analysis;

create policy preference_analysis_select on preference_analysis
  for select using (is_active_staff());
