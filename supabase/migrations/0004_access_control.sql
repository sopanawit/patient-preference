-- ============================================================================
-- Access control: request → approve → revoke + LINE config
-- อ้างอิงแผน Auth + Access Control (Admin-first)
--
-- โมเดล: แยก "คิวคำขอ" (access_requests, ไม่ผูก auth.users) ออกจาก
--        "บัญชีจริง" (staff, ผูก auth.users) — ทำให้ admin จัดการคำขอได้
--        โดยไม่ต้องรอผู้ขอมี auth user (ซึ่งจะเกิดตอน LINE login จริงภายหลัง)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- สถานะคำขอเข้าใช้งาน
-- ---------------------------------------------------------------------------
create type request_status as enum ('pending', 'approved', 'rejected');

-- ---------------------------------------------------------------------------
-- คิวคำขอเข้าใช้งาน (ยื่นผ่าน LINE LIFF — insert ทำผ่าน service role ภายหลัง)
-- ---------------------------------------------------------------------------
create table access_requests (
  id uuid primary key default gen_random_uuid(),
  line_user_id text unique,               -- LINE sub (nullable ระหว่างยังไม่ต่อ LINE)
  full_name text not null,
  department_id uuid references departments (id),
  note text,
  status request_status not null default 'pending',
  approved_role staff_role,               -- role ที่ admin เลือกตอน approve
  reviewed_by uuid references staff (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index access_requests_status_idx on access_requests (status);

-- ---------------------------------------------------------------------------
-- ขยาย staff: ผูก LINE + แผนกต้นสังกัด (ใช้ตาราง departments เดิมซ้ำ)
--   บัญชี admin = login email/password ; บัญชี LINE user = materialize ตอน login
--   revoke สิทธิ์ = set is_active = false (ใช้คอลัมน์เดิม)
-- ---------------------------------------------------------------------------
alter table staff add column line_user_id text unique;
alter table staff add column department_id uuid references departments (id);

-- ---------------------------------------------------------------------------
-- ค่าตั้งค่าระดับแอป (key/value) — admin แก้ได้ผ่านหน้าเว็บ
--   เก็บ LINE config เพื่อเสียบเชื่อม LINE login ภายหลัง
--   ⚠️ line_channel_secret เป็นความลับ: อ่าน/แก้ได้เฉพาะ admin เท่านั้น
--      production ควรพิจารณาย้าย secret ไปไว้ที่ Edge Function env แทน
-- ---------------------------------------------------------------------------
create table app_settings (
  key text primary key,
  value text not null default '',
  updated_by uuid references staff (id),
  updated_at timestamptz not null default now()
);

insert into app_settings (key) values
  ('line_liff_id'),
  ('line_channel_id'),
  ('line_channel_secret')
on conflict (key) do nothing;

create trigger app_settings_set_updated_at
  before update on app_settings
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table access_requests enable row level security;
alter table app_settings enable row level security;

-- access_requests: อ่าน/จัดการได้เฉพาะ admin (insert คำขอจริงทำผ่าน service role)
create policy access_requests_admin_select on access_requests
  for select using (is_admin());
create policy access_requests_admin_update on access_requests
  for update using (is_admin()) with check (is_admin());

-- app_settings: อ่าน/แก้ได้เฉพาะ admin
create policy app_settings_admin_select on app_settings
  for select using (is_admin());
create policy app_settings_admin_write on app_settings
  for all using (is_admin()) with check (is_admin());

-- audit_log: ให้เจ้าหน้าที่ที่ active เขียน log ในนามตัวเองได้ (actor = ตัวเอง)
-- (policy select เดิมของ reviewer ยังคงอยู่จาก 0002)
create policy audit_log_insert_self on audit_log
  for insert with check (is_active_staff() and actor = auth.uid());
