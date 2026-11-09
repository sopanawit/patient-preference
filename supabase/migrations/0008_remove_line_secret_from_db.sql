-- ============================================================================
-- ความปลอดภัย: เอา line_channel_secret ออกจาก app_settings (ตาราง DB)
--
-- เหตุผล: app_settings อ่านได้โดย admin ผ่าน anon client → ค่า secret ถูกส่งมา
-- ฝั่ง browser เมื่อเปิดหน้า "ตั้งค่า LINE" ซึ่งไม่ควรเกิดกับความลับระดับ secret
--
-- แนวทางที่ถูกต้อง: เก็บ Channel Secret เป็น Edge Function secret แทน เช่น
--   supabase secrets set LINE_CHANNEL_SECRET=xxxx
-- แล้วให้เฉพาะ Edge Function (LINE login flow เฟสถัดไป) อ่านจาก Deno.env เท่านั้น
--
-- หมายเหตุ: LINE login flow ยังไม่เปิดใช้ ค่านี้จึงยังไม่ถูกใช้งานจริง — ลบได้ปลอดภัย
-- ============================================================================

delete from app_settings where key = 'line_channel_secret';
