-- ============================================================================
-- เก็บอีเมล (denormalize) ไว้ในตาราง staff เพื่อให้หน้า admin แสดง/แก้ไขได้
-- แหล่งจริงยังคงเป็น auth.users.email — คอลัมน์นี้อัปเดตผ่าน Edge Function
-- (admin-create-user / admin-update-user) ทุกครั้งที่สร้าง/แก้อีเมล
-- ============================================================================
alter table staff add column if not exists email text;

-- backfill จาก auth.users สำหรับบัญชีที่มีอยู่แล้ว
update staff s
set email = u.email
from auth.users u
where u.id = s.id and s.email is null;
