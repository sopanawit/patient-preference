# CLAUDE.md — ระบบบันทึกความต้องการพิเศษของคนไข้ (Patient Preference System)

> ไฟล์นี้เป็นบริบทหลักสำหรับ Claude Code ในการพัฒนาระบบนี้
> โดเมน/กติกาธุรกิจเขียนเป็นภาษาไทย ส่วน identifier / โค้ด / schema เป็นภาษาอังกฤษ

---

## 1. ภาพรวมโปรเจกต์ (Project Overview)

ระบบภายในโรงพยาบาลสำหรับ **บันทึกและเผยแพร่ "ความต้องการพิเศษแบบ non-medical" ของคนไข้ที่จะเข้าแอดมิท** เพื่อให้แต่ละแผนกเตรียมการล่วงหน้าได้ เช่น คนไข้ชอบดูทีวี → แม่บ้านเตรียมทีวีเคลื่อนที่ไว้ในห้องตั้งแต่ทราบว่าจะเข้ามา

หัวใจของระบบคือ: เจ้าหน้าที่กรอกความชอบ/ไม่ชอบเป็น **free text** → **AI (Claude Opus 4.8) จัดหมวดและเรียบเรียงเป็น action รายแผนก** → **CX manager ตรวจยืนยันก่อนเผยแพร่** → เจ้าหน้าที่ค้นด้วย **HN** เพื่อดูผลที่ยืนยันแล้ว

**ขอบเขตสำคัญ (สิ่งที่ระบบนี้ *ไม่* ทำ):**
- ไม่เชื่อมต่อ HIS — เป็นระบบ standalone กรอกมือ
- ไม่เก็บข้อมูลทางการแพทย์ (อาการ/การวินิจฉัย/การรักษา) — **non-medical เท่านั้น**
- ไม่มี push notification — เป็น pull model (ค้นด้วย HN)

---

## 2. Tech Stack

| ส่วน | เทคโนโลยี |
|------|-----------|
| Frontend | React + TypeScript, รัน/บันเดิลด้วย **Bun** |
| Styling | **Tailwind CSS** |
| Backend / DB / Auth | **Supabase** (Postgres + Auth + Row Level Security + Edge Functions) |
| AI model | **Claude Opus 4.8** — เรียกผ่าน Supabase Edge Function เท่านั้น |
| Repo | **Monorepo** (โค้ดทั้งหมดอยู่ repository เดียว) |
| Deploy (frontend) | **AWS Amplify** |
| Deploy (backend) | Supabase (managed) |

**กติกาสำคัญ:** API key ของโมเดล **ห้ามอยู่ฝั่ง client** เด็ดขาด — ต้องอยู่ใน environment ของ Edge Function เท่านั้น

---

## 3. โครงสร้าง Repository (Monorepo)

```
/
├── apps/
│   └── web/                  # React + Bun frontend
│       ├── src/
│       │   ├── features/     # แยกตาม feature (entry, search, review, admin)
│       │   ├── components/   # UI components ที่ใช้ร่วมกัน
│       │   ├── lib/          # supabase client, helpers
│       │   └── types/        # generated Supabase types
│       └── package.json
├── supabase/
│   ├── migrations/           # SQL migrations (schema + RLS)
│   └── functions/
│       └── classify-preferences/   # Edge Function เรียก Opus 4.8
├── packages/
│   └── shared/               # types/constants ใช้ร่วมกัน client+edge
├── docs/                     # handoff doc ของแต่ละ phase (ดูข้อ 13)
└── CLAUDE.md
```

---

## 4. อภิธานศัพท์โดเมน (Glossary)

- **HN (Hospital Number):** รหัสประจำตัวคนไข้ — เป็น business key ที่ผูกความชอบไว้ถาวร
- **การแอดมิท (Admission):** การเข้าพักหนึ่งครั้ง มีห้องพักและวันที่ของตัวเอง คนไข้หนึ่งคน (HN) มีได้หลายรอบ
- **ความต้องการพิเศษ (Preference):** ข้อความ free text 2 ช่อง — สิ่งที่ชอบ / สิ่งที่ไม่ชอบ (non-medical)
- **Analysis:** ผลที่ AI จัดหมวดความต้องการเป็น action รายแผนก
- **แผนกปลายทาง (Department):** ปลายทางที่ AI จัด action ให้ ตั้งค่าได้โดย admin
- **สถานะ record:** `pending_review` (รอ CX ตรวจ) / `confirmed` (ยืนยันแล้ว เผยแพร่ได้)

---

## 5. Roles & Permissions

มี 4 บทบาท เก็บเป็น enum บน user profile และบังคับด้วย **Supabase RLS**

| ความสามารถ | CS | Nurse | CX Manager | Admin |
|------------|:--:|:-----:|:----------:|:-----:|
| สร้าง/แก้ ข้อมูลคนไข้ + ความชอบ (free text) | ✅ | ✅ | ✅ | ✅ |
| สร้าง/แก้ การแอดมิท (ห้องพัก) | ✅ | ✅ | ✅ | ✅ |
| ค้นด้วย HN + ดู free text | ✅ | ✅ | ✅ | ✅ |
| เห็น action รายแผนกที่ **ยืนยันแล้ว** | ✅ | ✅ | ✅ | ✅ |
| เห็น/แก้ action ที่ **รอตรวจ** + กดยืนยัน | ❌ | ❌ | ✅ | ✅ |
| จัดการหมวดแผนกปลายทาง | ❌ | ❌ | ➖ | ✅ |
| จัดการบัญชีผู้ใช้ | ❌ | ❌ | ➖ | ✅ |

> **สมมติฐานที่ต้องยืนยัน:** ตอนนี้กำหนด `admin` เป็นบทบาทแยกสำหรับงานตั้งค่า (หมวด/ผู้ใช้) — จะให้ CX manager เป็น admin ไปด้วยเลย หรือแยกเป็น IT ก็ปรับได้

---

## 6. Data Model (Supabase / Postgres)

หลักการออกแบบสำคัญ: **แยกข้อมูล 2 ระดับ**
- ระดับ **คนไข้ (ผูก HN, ถาวร)** → ความชอบ/ไม่ชอบ ใช้ซ้ำได้ทุกรอบแอดมิท
- ระดับ **การแอดมิท (ต่อรอบ)** → ห้องพัก, วันที่, สถานะ

```sql
-- ผู้ใช้ระบบ (ผูกกับ auth.users)
create type staff_role as enum ('cs', 'nurse', 'cx_manager', 'admin');
create table staff (
  id uuid primary key references auth.users(id),
  full_name text not null,
  role staff_role not null,
  is_active boolean not null default true
);

-- คนไข้ (HN เป็น business key) + ความชอบระดับบุคคล (ถาวร)
create table patients (
  hn text primary key,
  full_name text not null,
  likes_text text default '',       -- free text: สิ่งที่ชอบ
  dislikes_text text default '',     -- free text: สิ่งที่ไม่ชอบ
  updated_by uuid references staff(id),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- การแอดมิทแต่ละรอบ
create type admission_status as enum ('active', 'discharged');
create table admissions (
  id uuid primary key default gen_random_uuid(),
  hn text not null references patients(hn),
  room text not null,
  admit_date date not null default current_date,
  status admission_status not null default 'active',
  created_by uuid references staff(id),
  created_at timestamptz not null default now()
);

-- หมวดแผนกปลายทาง (admin ตั้งค่าเพิ่ม/ลบได้)
create table departments (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,         -- เช่น 'housekeeping'
  name_th text not null,             -- เช่น 'แผนกแม่บ้าน'
  is_active boolean not null default true,
  sort_order int not null default 0
);
-- seed เริ่มต้น: housekeeping(แม่บ้าน), dietary(โภชนาการ),
--               nursing(พยาบาลและแพทย์), other(อื่น ๆ = catch-all)

-- ผลการจัดหมวดของ AI (ระดับคนไข้ — เพราะ preference ผูก HN)
create type analysis_status as enum ('pending_review', 'confirmed');
create table preference_analysis (
  id uuid primary key default gen_random_uuid(),
  hn text not null references patients(hn),
  status analysis_status not null default 'pending_review',
  model text not null default 'claude-opus-4-8',
  source_hash text,                  -- hash ของ likes+dislikes ที่ใช้ gen (กันซ้ำ)
  generated_at timestamptz not null default now(),
  reviewed_by uuid references staff(id),
  reviewed_at timestamptz,
  is_current boolean not null default true  -- version ล่าสุดของ HN นี้
);

-- รายการย่อย: 1 ความต้องการ → 1 record
create table analysis_items (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references preference_analysis(id) on delete cascade,
  source text not null check (source in ('like','dislike')),
  original_text text not null        -- ข้อความ free text ต้นทางที่อ้างอิง
);

-- การจัด action: 1 ความต้องการ → หลายแผนกได้
create table analysis_assignments (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references analysis_items(id) on delete cascade,
  department_id uuid not null references departments(id),
  action_text text not null,         -- action ที่ AI เรียบเรียง / CX แก้
  edited_by_reviewer boolean not null default false
);

-- audit log (ดูข้อ 7.7)
create table audit_log (
  id bigserial primary key,
  actor uuid references staff(id),
  action text not null,              -- 'create'|'update'|'confirm'|'reanalyze'...
  entity text not null,              -- 'patient'|'admission'|'analysis'|'department'
  entity_id text not null,
  detail jsonb,
  at timestamptz not null default now()
);
```

**RLS โดยสรุป:**
- ทุกบทบาทที่ active: `select/insert/update` บน `patients`, `admissions`
- `patients.likes_text` / `dislikes_text` และ `analysis_items.original_text` = เห็นได้ทุกบทบาท (free text ดิบไม่ถูกล็อก)
- `analysis_assignments` และ `preference_analysis` ที่ `status = 'confirmed'` = อ่านได้ทุกบทบาท
- ที่ `status = 'pending_review'` = อ่าน/แก้/ยืนยันได้เฉพาะ `cx_manager`, `admin`
- `departments`, `staff` = จัดการได้เฉพาะ `admin`

---

## 7. Business Logic (รายละเอียด)

### 7.1 การกรอกข้อมูล
- ช่อง likes/dislikes เป็น free text ต้องมี **hint กำกับชัดเจน**: “กรอกเฉพาะเรื่องทั่วไป เช่น สภาพห้อง สิ่งอำนวยความสะดวก การสื่อสาร — **ห้ามกรอกอาการป่วย/การวินิจฉัย/การรักษา**”
- CS และ Nurse กรอก/แก้ได้ทั้งคู่ (พยาบาลบันทึกสิ่งที่สังเกตเห็นระหว่างดูแลได้)
- HN ที่มีอยู่แล้ว → ระบบดึงความชอบเดิมขึ้นมาให้ทันที (ดู 7.2)

### 7.2 การใช้ซ้ำข้ามรอบแอดมิท (Reuse)
- ความชอบผูกกับ **HN ถาวร** → คนไข้กลับมาแอดมิทรอบใหม่ ไม่ต้องกรอกความชอบใหม่
- รอบใหม่ = สร้าง `admission` record ใหม่ (กรอกแค่ห้องพัก) โดย analysis ที่ `confirmed` ของ HN นั้นยังใช้ได้เลย
- ตอนคนไข้จำหน่าย: set `admissions.status = 'discharged'` — **ไม่ลบ** ข้อมูลคนไข้/ความชอบ/analysis

### 7.3 การจัดหมวดด้วย AI (หัวใจของระบบ)
- **Trigger:** รัน **อัตโนมัติ** หลังบันทึก/แก้ likes|dislikes (ผ่าน Edge Function `classify-preferences`)
- **กติกาการแมป:**
  - ความต้องการ 1 ข้อ **แมปได้หลายแผนก** เช่น “ไม่ชอบเสียงดัง” → พยาบาล (พูดเบา) + แม่บ้าน (ทำงานช่วงรบกวนน้อย)
  - AI ไม่ใช่แค่ติดป้ายหมวด แต่ต้อง **เรียบเรียงเป็น action ที่ทำได้จริง** ต่อแผนก เช่น “เตรียมทีวีเคลื่อนที่ไว้ในห้องก่อนคนไข้เข้า”
  - หมวดที่จัดไม่เข้า 3 แผนกหลัก → ลงหมวด `other`
- **หมวดปลายทางเป็น dynamic:** prompt ต้องดึงรายชื่อ `departments` (is_active) จาก DB ไปใส่ตอนเรียก ไม่ hardcode ในโค้ด
- ผลลัพธ์ที่ได้ → บันทึกเป็น `preference_analysis` ใหม่ (is_current=true, ปิดตัวเก่า) สถานะ `pending_review`
- ใช้ `source_hash` กัน re-generate ซ้ำถ้า likes/dislikes ไม่เปลี่ยน

### 7.4 วงจรสถานะ (State Machine)
```
[กรอก/แก้ free text]
        │  (auto)
        ▼
   AI จัดหมวด ──► pending_review ──►(CX ยืนยัน/แก้)──► confirmed
                      ▲                                   │
                      └──────── แก้ free text อีกครั้ง ────┘
```
- **กติกาสำคัญ:** เมื่อ record ที่ `confirmed` ถูกแก้ความชอบ → **regenerate + เด้งกลับ `pending_review`** ให้ CX ตรวจซ้ำ (กันข้อมูลเผยแพร่โดยไม่ผ่านตา)
- การ transition ไป `confirmed` ทำได้เฉพาะ `cx_manager` / `admin`

### 7.5 การค้นหาและแสดงผล (Search & Display)
- ค้นด้วย **HN** → แสดง: ชื่อ, ห้องพัก ณ ปัจจุบัน (จาก admission ที่ active), likes/dislikes, และ action รายแผนก
- **ระหว่าง `pending_review`:** CS/Nurse ค้นเจอและเห็น **free text ดิบ** ได้ทันที (เผื่อคนไข้มาถึงก่อน CX ตรวจทัน) แต่ **ยังไม่เห็น action รายแผนก** จนกว่าจะ `confirmed`
- action รายแผนกจัดกลุ่มตามหมวด อ่านง่าย เช่น “แผนกแม่บ้าน: …”, “พยาบาลและแพทย์: …”

### 7.6 การตรวจของ CX Manager
- มีหน้า “คิวรอตรวจ” แสดง `preference_analysis` ที่ `pending_review`
- CX ดู original_text คู่กับ action ที่ AI เสนอ → แก้ `action_text` ได้ (set `edited_by_reviewer=true`) / ย้ายแผนก / ลบ → กด **ยืนยัน**
- ยืนยันแล้ว → `status=confirmed`, บันทึก `reviewed_by/reviewed_at`

### 7.7 Audit Log
- บันทึกทุกการ create/update/confirm/reanalyze บน patient, admission, analysis, department
- เก็บ actor + timestamp + detail (diff) — จำเป็นเพราะหลายคนแก้ได้และเป็นข้อมูลบุคคล

---

## 8. AI Integration (`classify-preferences` Edge Function)

- **Input:** `hn`, `likes_text`, `dislikes_text`, และรายชื่อ `departments` (active) จาก DB
- **Model:** `claude-opus-4-8`
- **System prompt** ต้องระบุ:
  - บทบาท: จัดความต้องการ non-medical ของคนไข้เป็น action รายแผนกจากรายชื่อหมวดที่ให้เท่านั้น
  - ผลลัพธ์เป็นภาษาไทย, เป็น action ที่ทำได้จริง
  - ถ้าจัดไม่เข้าหมวดหลัก → `other`
  - ห้ามแต่งเติมความต้องการที่ผู้ใช้ไม่ได้กรอก
- **Output:** ขอเป็น JSON เท่านั้น (ไม่มี preamble/markdown) parse แล้วค่อยบันทึก

```json
{
  "items": [
    {
      "source": "like",
      "original_text": "ชอบดูทีวีมาก มักขอทีวีเคลื่อนที่",
      "assignments": [
        { "department_code": "housekeeping",
          "action": "เตรียมทีวีเคลื่อนที่ไว้ในห้องพักก่อนคนไข้เข้า" }
      ]
    },
    {
      "source": "dislike",
      "original_text": "ไม่ชอบเสียงดัง",
      "assignments": [
        { "department_code": "nursing", "action": "เข้าห้องพูดคุยด้วยเสียงเบา" },
        { "department_code": "housekeeping", "action": "จัดคิวงานที่มีเสียงในช่วงที่รบกวนน้อย" }
      ]
    }
  ]
}
```
- **Error handling:** ถ้า parse ไม่ผ่าน/timeout → ไม่ทำให้การบันทึก free text ล้ม (แยก transaction) ตั้ง analysis เป็นสถานะ error/retry ได้
- **Validation:** `department_code` ต้องมีจริงใน DB เท่านั้น ไม่งั้น fallback เป็น `other`

---

## 9. Security & Privacy (PDPA)

- ข้อมูลเป็น **personal data แต่ไม่ใช่ sensitive data (ม.26)** เพราะเป็น non-medical → ใช้มาตรการระดับ personal data ปกติ
- Guard ในระบบ: hint + (ทางเลือก) เตือนเมื่อพบคำที่อาจเป็นข้อมูลการแพทย์
- **API key ของ Opus 4.8 อยู่ใน Edge Function env เท่านั้น** — ห้าม expose ฝั่ง React
- ควบคุมการเข้าถึงด้วย **RLS** ตามบทบาท + เก็บ audit log
- แนะนำมี consent/นโยบายการใช้ข้อมูลระดับองค์กร (นอกขอบเขตโค้ด แต่ควรระบุใน onboarding)

---

## 10. Frontend Conventions

- React + TypeScript, functional components + hooks
- Bun เป็น runtime/บันเดิล (`bun install`, `bun run dev`, `bun run build`)
- Tailwind สำหรับ styling ทั้งหมด — ใช้ utility classes, ไม่เขียน CSS แยกเว้นจำเป็น
- Supabase client typed ด้วย generated types (`supabase gen types typescript`)
- UI/labels ภาษาไทย
- แยกโค้ดตาม feature ใน `src/features/{entry,search,review,admin}`

---

## 11. หน้าจอหลัก (Screens)

1. **หน้ากรอกข้อมูล** — HN, ชื่อ-สกุล, ห้องพัก, likes, dislikes (+ hint non-medical) ; HN เดิม → auto-fill ความชอบ
2. **หน้าค้นด้วย HN** — แสดงชื่อ/ห้อง/ความชอบ + action รายแผนก (ตาม 7.5)
3. **คิวรอตรวจ (CX)** — รายการ pending + ตัวแก้ action + ปุ่มยืนยัน
4. **ตั้งค่า (Admin)** — จัดการหมวดแผนก + บัญชีผู้ใช้/บทบาท

---

## 12. Deployment

- **Frontend → AWS Amplify** (build ด้วย Bun) ; ตั้ง env ชี้ Supabase URL + anon key
- **Backend → Supabase** ; migrations ใน `supabase/migrations`, functions deploy ด้วย Supabase CLI
- Secrets: Anthropic/Opus key ตั้งใน Supabase Edge Function secrets เท่านั้น

---

## 13. Phased Delivery + Handoff Docs

> **กติกา:** จบแต่ละ phase ให้เขียน **handoff doc** ลง `./docs/phase-N-<ชื่อ>.md`
> ระบุ: ทำอะไรไปแล้ว, การตัดสินใจสำคัญ, schema/endpoint ที่เพิ่ม, วิธีรัน/ทดสอบ, และงานที่เหลือ/ค้าง

- **Phase 0 — Scaffold:** monorepo, Bun+React+Tailwind, Supabase project, auth + roles + RLS พื้นฐาน, seed departments
- **Phase 1 — Core CRUD:** patients + admissions, หน้ากรอก, ค้นด้วย HN, แสดง free text (ยังไม่มี AI)
- **Phase 2 — AI:** Edge Function `classify-preferences` + Opus 4.8, auto-run, บันทึก analysis, หน้าตั้งค่าหมวด (admin)
- **Phase 3 — Review workflow:** คิวรอตรวจ CX, state machine, regenerate+เด้งกลับเมื่อแก้, gate การแสดง action
- **Phase 4 — Hardening:** audit log, PDPA guards, edge cases, polish

---

## 14. Coding Conventions (สรุป)

- ภาษา: TypeScript ทั้ง frontend และ Edge Functions
- ห้าม hardcode รายชื่อแผนก / secret / model behavior ที่ควรอยู่ใน DB หรือ env
- ทุก mutation ที่กระทบข้อมูลบุคคล → เขียน audit_log
- แยก transaction: การบันทึก free text ต้องไม่ล้มเพราะ AI ล้ม
- เขียน migration เป็นไฟล์ (ไม่แก้ schema ด้วยมือบน dashboard อย่างเดียว)

---

## 15. สมมติฐาน/คำถามที่ยังเปิดอยู่ (ยืนยันได้ภายหลัง)

1. `admin` เป็นบทบาทแยก หรือให้ CX manager ทำหน้าที่ admin ด้วย
2. การเรียก Opus 4.8: ผ่าน **Anthropic API ตรง** หรือ **AWS Bedrock** (ค่าเริ่มต้นในเอกสารนี้คือเรียกจาก Edge Function — เลือก transport ได้)
3. ตอนคนไข้ย้ายห้องระหว่างพัก ใครเป็นผู้อัปเดต `admissions.room` (ปัจจุบันให้ CS/Nurse แก้ได้)
4. ต้องการเก็บประวัติเวอร์ชันของความชอบ (นอกเหนือจาก audit_log) เพื่อดูย้อนหลังหรือไม่
