-- ============================================================================
-- Dev / local seed — รันอัตโนมัติหลัง migrations เมื่อ `supabase db reset`
-- ⚠️ ข้อมูลตัวอย่างสำหรับ local เท่านั้น ห้ามใช้กับ production
--    คำขอจริงจะถูกสร้างผ่าน LINE LIFF ภายหลัง (นอกขอบเขตรอบนี้)
-- ============================================================================

-- ตัวอย่างคำขอเข้าใช้งานสถานะ pending (ผูกแผนกจาก seed departments)
insert into access_requests (line_user_id, full_name, department_id, note, status)
select v.line_user_id, v.full_name, d.id, v.note, 'pending'::request_status
from (values
  ('Udev_sample_001', 'สมหญิง ใจดี',   'housekeeping', 'ขอเข้าใช้งานจากเมนู LINE'),
  ('Udev_sample_002', 'สมชาย รักงาน',  'nursing',      'พยาบาลหอผู้ป่วยใน'),
  ('Udev_sample_003', 'มานี มีสุข',     'dietary',      NULL)
) as v(line_user_id, full_name, dept_code, note)
join departments d on d.code = v.dept_code
on conflict (line_user_id) do nothing;

-- ---------------------------------------------------------------------------
-- Bootstrap admin (ทำครั้งเดียวหลังสร้าง auth user)
--   1) สร้าง auth user (Supabase Studio หรือ CLI) ด้วย email ที่ต้องการ
--   2) แก้ email ด้านล่างให้ตรง แล้ว migration/seed จะ promote เป็น admin
-- หมายเหตุ: comment ไว้เพราะต้องมี auth user ก่อน — uncomment เมื่อพร้อม
-- ---------------------------------------------------------------------------
-- insert into staff (id, full_name, role, is_active)
-- select id, 'System Admin', 'admin', true
-- from auth.users
-- where email = 'admin@example.com'
-- on conflict (id) do update set role = 'admin', is_active = true;
