# Frontend-first + Data-access layer (Handoff)

> ตัดสินใจปรับลำดับ: ทำ **frontend ทุกหน้าให้ครบก่อน** แล้วค่อยทำ backend จริง

## ทำอะไรไปแล้ว

วาง **data-access layer** เป็นแกนกลาง + ต่อทุกหน้าจอหลักให้ **คลิกได้/เดโมได้จริง** ด้วย mock backend (ไม่ต้องมี Supabase)

### Data layer — `apps/web/src/data/`
- `model.ts` — domain/view types
- `api.ts` — interface `DataClient` (auth, patients, analysis, departments, access, settings, dashboard)
- `mock.ts` — **in-memory store + seed + AI จำลอง** (heuristic แยกบรรทัด → แมปแผนก → fallback `other`)
- `supabase.ts` — Supabase impl (auth/access/settings/departments/dashboard ต่อจริง ; patients/analysis โยน error รอเฟส backend)
- `index.ts` — เลือก backend ตาม `VITE_DATA_BACKEND` (ค่าเริ่มต้น `mock`)

### หน้าจอ (ทุกหน้าผ่าน data layer)
- **Login** (`auth/LoginPage`) — mock: ล็อกอินอีเมลอะไรก็เข้าเป็น admin ; `cx@`/`nurse@hospital.local` ดูมุมมองบทบาทอื่น
- **Dashboard** — การ์ดสรุป (นับจาก data layer)
- **กรอกข้อมูล** (`entry/EntryPage`) — HN lookup + autofill, บันทึก patient+ห้อง ; แก้ likes/dislikes → regenerate analysis เด้งกลับ pending
- **ค้นด้วย HN** (`search/SearchPage`) — แสดงชื่อ/ห้อง/ความชอบ + action รายแผนก (เฉพาะที่ confirmed ; pending แสดงหมายเหตุ ตาม 7.5)
- **คิวรอตรวจ** (`review/ReviewPage`) — แก้ action_text/ย้ายแผนก/ลบ + ยืนยัน → confirmed
- **ตั้งค่า admin** — จัดการสิทธิ์ (เดิม), **จัดการหมวดแผนก** (ใหม่), ตั้งค่า LINE
- auth/guards/dashboard/access/line settings ถูก refactor มาใช้ data layer แทนการเรียก supabase ตรง

### อื่น ๆ
- `lib/supabase.ts` → สร้าง client แบบ **lazy (proxy)** ; import ได้โดยไม่ crash แม้ไม่มี `.env` (สำคัญสำหรับ mock mode)
- ลบ `lib/audit.ts` (mutation audit จะทำในชั้น supabase impl เฟส backend)

## การตัดสินใจสำคัญ
- **UI พึ่งพา interface เท่านั้น** → สลับ mock↔supabase ด้วย env โดยไม่แตะ UI
- mock AI จำลองพอให้ทดสอบ flow ตรวจ/ยืนยันได้จริง (ไม่เรียกโมเดลจริง)
- state machine (แก้ free text → regenerate → pending_review) จำลองใน mock ครบ

## วิธีรัน / ทดสอบ
```bash
bun install
bun run --cwd apps/web dev      # ค่าเริ่มต้น = mock backend ไม่ต้องมี .env/Supabase
# เปิด http://localhost:5173 → ล็อกอิน → ลองค้น HN0001 (confirmed) / HN0002 (pending)
```

### ผลการตรวจในสภาพแวดล้อมนี้
- ✅ `bun run typecheck` + `bun run build` (96 modules) ผ่าน
- ✅ **smoke test ตรรกะ data layer ผ่าน 14/14** (dashboard counts, login, gate confirmed/pending, save→regenerate→pending, confirm, approve)
- ⚠️ ไม่ได้รัน browser E2E (preview server ถูก sandbox reap) — ตรรกะหลักตรวจผ่าน smoke test แทน

## งานที่เหลือ (เฟส backend)
- [ ] เติม supabase impl ของ `patients`/`analysis` (CRUD + trigger AI) แทน mock
- [ ] Edge Function `classify-preferences` (Opus 4.8) + auto-run หลังบันทึก
- [ ] เขียน audit_log ในชั้น supabase impl ของทุก mutation
- [ ] ตั้ง `VITE_DATA_BACKEND=supabase` + generate `database.ts` จริง + ทดสอบ RLS end-to-end
- [ ] LINE login flow (ตาม docs/phase-0.5-auth-access.md)
