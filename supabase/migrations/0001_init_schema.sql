-- ============================================================================
-- Patient Preference System — Initial schema
-- อ้างอิง CLAUDE.md ข้อ 6 (Data Model)
-- หลักการ: แยกข้อมูล 2 ระดับ — ระดับคนไข้ (ผูก HN ถาวร) และระดับการแอดมิท (ต่อรอบ)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type staff_role as enum ('cs', 'nurse', 'cx_manager', 'admin');
create type admission_status as enum ('active', 'discharged');
create type analysis_status as enum ('pending_review', 'confirmed');

-- ---------------------------------------------------------------------------
-- ผู้ใช้ระบบ (ผูกกับ auth.users)
-- ---------------------------------------------------------------------------
create table staff (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  role staff_role not null,
  is_active boolean not null default true
);

-- ---------------------------------------------------------------------------
-- คนไข้ (HN เป็น business key) + ความชอบระดับบุคคล (ถาวร)
-- ---------------------------------------------------------------------------
create table patients (
  hn text primary key,
  full_name text not null,
  likes_text text default '',      -- free text: สิ่งที่ชอบ (non-medical)
  dislikes_text text default '',    -- free text: สิ่งที่ไม่ชอบ (non-medical)
  updated_by uuid references staff (id),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- การแอดมิทแต่ละรอบ (หนึ่ง HN มีได้หลายรอบ)
-- ---------------------------------------------------------------------------
create table admissions (
  id uuid primary key default gen_random_uuid(),
  hn text not null references patients (hn),
  room text not null,
  admit_date date not null default current_date,
  status admission_status not null default 'active',
  created_by uuid references staff (id),
  created_at timestamptz not null default now()
);
create index admissions_hn_idx on admissions (hn);
create index admissions_active_idx on admissions (hn) where status = 'active';

-- ---------------------------------------------------------------------------
-- หมวดแผนกปลายทาง (admin ตั้งค่าเพิ่ม/ลบได้ — dynamic)
-- ---------------------------------------------------------------------------
create table departments (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,        -- เช่น 'housekeeping'
  name_th text not null,            -- เช่น 'แผนกแม่บ้าน'
  is_active boolean not null default true,
  sort_order int not null default 0
);

-- ---------------------------------------------------------------------------
-- ผลการจัดหมวดของ AI (ระดับคนไข้ — เพราะ preference ผูก HN)
-- ---------------------------------------------------------------------------
create table preference_analysis (
  id uuid primary key default gen_random_uuid(),
  hn text not null references patients (hn),
  status analysis_status not null default 'pending_review',
  model text not null default 'claude-opus-4-8',
  source_hash text,                 -- hash ของ likes+dislikes ที่ใช้ gen (กันซ้ำ)
  generated_at timestamptz not null default now(),
  reviewed_by uuid references staff (id),
  reviewed_at timestamptz,
  is_current boolean not null default true  -- version ล่าสุดของ HN นี้
);
create index preference_analysis_hn_idx on preference_analysis (hn);
-- มี current analysis ได้เพียงหนึ่งเดียวต่อ HN
create unique index preference_analysis_one_current_idx
  on preference_analysis (hn) where is_current;

-- ---------------------------------------------------------------------------
-- รายการย่อย: 1 ความต้องการ → 1 record
-- ---------------------------------------------------------------------------
create table analysis_items (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references preference_analysis (id) on delete cascade,
  source text not null check (source in ('like', 'dislike')),
  original_text text not null       -- ข้อความ free text ต้นทางที่อ้างอิง
);
create index analysis_items_analysis_idx on analysis_items (analysis_id);

-- ---------------------------------------------------------------------------
-- การจัด action: 1 ความต้องการ → หลายแผนกได้
-- ---------------------------------------------------------------------------
create table analysis_assignments (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references analysis_items (id) on delete cascade,
  department_id uuid not null references departments (id),
  action_text text not null,        -- action ที่ AI เรียบเรียง / CX แก้
  edited_by_reviewer boolean not null default false
);
create index analysis_assignments_item_idx on analysis_assignments (item_id);

-- ---------------------------------------------------------------------------
-- Audit log (ดู CLAUDE.md ข้อ 7.7) — จำเป็นเพราะหลายคนแก้ได้และเป็นข้อมูลบุคคล
-- ---------------------------------------------------------------------------
create table audit_log (
  id bigserial primary key,
  actor uuid references staff (id),
  action text not null,             -- 'create'|'update'|'confirm'|'reanalyze'...
  entity text not null,             -- 'patient'|'admission'|'analysis'|'department'
  entity_id text not null,
  detail jsonb,
  at timestamptz not null default now()
);
create index audit_log_entity_idx on audit_log (entity, entity_id);

-- ---------------------------------------------------------------------------
-- Trigger: อัปเดต patients.updated_at อัตโนมัติเมื่อมีการแก้ไข
-- ---------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger patients_set_updated_at
  before update on patients
  for each row execute function set_updated_at();
