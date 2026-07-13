# Patient Preference System

ระบบภายในโรงพยาบาลสำหรับ **บันทึกและเผยแพร่ "ความต้องการพิเศษแบบ non-medical" ของคนไข้ก่อนเข้าแอดมิท** เพื่อให้แต่ละแผนกเตรียมการล่วงหน้าได้ (เช่น คนไข้ชอบดูทีวี → แม่บ้านเตรียมทีวีเคลื่อนที่ไว้ในห้องล่วงหน้า)

โฟลว์หลัก: เจ้าหน้าที่กรอกความชอบ/ไม่ชอบเป็น free text → **AI (Claude Opus 4.8)** จัดหมวดและเรียบเรียงเป็น action รายแผนก → **CX Manager** ตรวจยืนยันก่อนเผยแพร่ → เจ้าหน้าที่ค้นด้วย **HN** เพื่อดูผลที่ยืนยันแล้ว

> รายละเอียดโดเมน กติกาธุรกิจ data model และ phased delivery ทั้งหมดอยู่ใน [`CLAUDE.md`](./CLAUDE.md) — เป็นเอกสารอ้างอิงหลัก

## Tech Stack

| ส่วน | เทคโนโลยี |
|------|-----------|
| Frontend | React + TypeScript (runtime/bundler: **Bun**) |
| Styling | Tailwind CSS |
| Backend / DB / Auth | Supabase (Postgres + Auth + RLS + Edge Functions) |
| AI | Claude Opus 4.8 — เรียกผ่าน Supabase Edge Function เท่านั้น |
| Deploy | Frontend → AWS Amplify · Backend → Supabase |

## โครงสร้าง Monorepo

```
.
├── apps/web/          React + Bun frontend (features: entry, search, review, admin)
├── supabase/          migrations (schema + RLS + seed) + Edge Functions
├── packages/shared/   types/constants ใช้ร่วมกัน client + edge
├── docs/              handoff doc ของแต่ละ phase
└── CLAUDE.md          บริบทหลักของโปรเจกต์
```

## เริ่มต้นพัฒนา (Getting Started)

ต้องมี [Bun](https://bun.sh) และ [Supabase CLI](https://supabase.com/docs/guides/cli) ติดตั้งไว้

```bash
# 1) ติดตั้ง dependencies (ทั้ง workspace)
bun install

# 2) ตั้งค่า environment
cp apps/web/.env.example apps/web/.env      # ใส่ Supabase URL + anon key
cp supabase/.env.example supabase/.env       # ใส่ ANTHROPIC_API_KEY (เฉพาะฝั่ง edge)

# 3) รัน Supabase local + apply migrations
supabase start
supabase db reset      # apply migrations + seed departments

# 4) รัน frontend
bun run dev
```

> ⚠️ **API key ของโมเดลห้ามอยู่ฝั่ง client เด็ดขาด** — ตั้งไว้ใน Supabase Edge Function secrets เท่านั้น (ดู `supabase/.env.example`)

## Phased Delivery

| Phase | ขอบเขต | สถานะ |
|-------|--------|:-----:|
| 0 — Scaffold | monorepo, Bun+React+Tailwind, schema + RLS + seed | ✅ scaffolded |
| 1 — Core CRUD | patients + admissions, หน้ากรอก, ค้นด้วย HN | ⬜ |
| 2 — AI | Edge Function `classify-preferences` + Opus 4.8 | ⬜ |
| 3 — Review workflow | คิวรอตรวจ CX + state machine | ⬜ |
| 4 — Hardening | audit log, PDPA guards, polish | ⬜ |

จบแต่ละ phase เขียน handoff doc ลง [`docs/`](./docs) — ดู [`docs/phase-0-scaffold.md`](./docs/phase-0-scaffold.md)
