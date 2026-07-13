-- ============================================================================
-- Row Level Security (RLS)
-- อ้างอิง CLAUDE.md ข้อ 5 (Roles & Permissions) และข้อ 6 (RLS โดยสรุป)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Helper functions (security definer) — อ่าน role ของผู้ใช้ปัจจุบัน
-- แยกออกมาเป็นฟังก์ชันเพื่อเลี่ยง recursive RLS บนตาราง staff
-- ---------------------------------------------------------------------------
create or replace function current_staff_role()
returns staff_role
language sql
stable
security definer
set search_path = public
as $$
  select role from staff where id = auth.uid() and is_active;
$$;

create or replace function is_active_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from staff where id = auth.uid() and is_active);
$$;

create or replace function is_reviewer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select current_staff_role() in ('cx_manager', 'admin');
$$;

create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select current_staff_role() = 'admin';
$$;

-- ---------------------------------------------------------------------------
-- เปิด RLS ทุกตาราง
-- ---------------------------------------------------------------------------
alter table staff enable row level security;
alter table patients enable row level security;
alter table admissions enable row level security;
alter table departments enable row level security;
alter table preference_analysis enable row level security;
alter table analysis_items enable row level security;
alter table analysis_assignments enable row level security;
alter table audit_log enable row level security;

-- ---------------------------------------------------------------------------
-- staff — เห็นตัวเองได้ทุกคน / จัดการได้เฉพาะ admin
-- ---------------------------------------------------------------------------
create policy staff_select_self_or_admin on staff
  for select using (id = auth.uid() or is_admin());
create policy staff_admin_write on staff
  for all using (is_admin()) with check (is_admin());

-- ---------------------------------------------------------------------------
-- patients — ทุกบทบาทที่ active: select/insert/update (free text ดิบไม่ถูกล็อก)
-- ---------------------------------------------------------------------------
create policy patients_select on patients
  for select using (is_active_staff());
create policy patients_insert on patients
  for insert with check (is_active_staff());
create policy patients_update on patients
  for update using (is_active_staff()) with check (is_active_staff());

-- ---------------------------------------------------------------------------
-- admissions — ทุกบทบาทที่ active: select/insert/update
-- ---------------------------------------------------------------------------
create policy admissions_select on admissions
  for select using (is_active_staff());
create policy admissions_insert on admissions
  for insert with check (is_active_staff());
create policy admissions_update on admissions
  for update using (is_active_staff()) with check (is_active_staff());

-- ---------------------------------------------------------------------------
-- departments — อ่านได้ทุกบทบาท / จัดการได้เฉพาะ admin
-- ---------------------------------------------------------------------------
create policy departments_select on departments
  for select using (is_active_staff());
create policy departments_admin_write on departments
  for all using (is_admin()) with check (is_admin());

-- ---------------------------------------------------------------------------
-- preference_analysis
--   confirmed  → อ่านได้ทุกบทบาท
--   pending_review → อ่าน/แก้/ยืนยันได้เฉพาะ cx_manager, admin
-- (การ insert/regenerate ทำผ่าน Edge Function ด้วย service role — bypass RLS)
-- ---------------------------------------------------------------------------
create policy preference_analysis_select on preference_analysis
  for select using (
    is_active_staff() and (status = 'confirmed' or is_reviewer())
  );
create policy preference_analysis_reviewer_update on preference_analysis
  for update using (is_reviewer()) with check (is_reviewer());

-- ---------------------------------------------------------------------------
-- analysis_items — original_text (free text ดิบ) เห็นได้ทุกบทบาท
-- ---------------------------------------------------------------------------
create policy analysis_items_select on analysis_items
  for select using (is_active_staff());

-- ---------------------------------------------------------------------------
-- analysis_assignments — action รายแผนก
--   confirmed → เห็นได้ทุกบทบาท ; pending_review → เฉพาะ reviewer
--   แก้ได้เฉพาะ reviewer
-- ---------------------------------------------------------------------------
create policy analysis_assignments_select on analysis_assignments
  for select using (
    is_active_staff() and exists (
      select 1
      from analysis_items i
      join preference_analysis a on a.id = i.analysis_id
      where i.id = analysis_assignments.item_id
        and (a.status = 'confirmed' or is_reviewer())
    )
  );
create policy analysis_assignments_reviewer_write on analysis_assignments
  for all using (is_reviewer()) with check (is_reviewer());

-- ---------------------------------------------------------------------------
-- audit_log — reviewer/admin อ่านได้ ; เขียนผ่าน service role/trigger เท่านั้น
-- ---------------------------------------------------------------------------
create policy audit_log_select on audit_log
  for select using (is_reviewer());
