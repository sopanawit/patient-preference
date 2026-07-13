import { PlaceholderPage } from "@/components/PlaceholderPage";

/**
 * ตั้งค่า (Admin) — จัดการหมวดแผนกปลายทาง + บัญชีผู้ใช้/บทบาท
 * ดู CLAUDE.md ข้อ 11.4 · จะ implement ใน Phase 2 (หมวด) และ Phase 4 · เข้าถึงได้เฉพาะ admin
 */
export function AdminPage() {
  return (
    <PlaceholderPage
      title="ตั้งค่า (Admin)"
      phase="Phase 2"
      description="จัดการหมวดแผนกปลายทาง (เพิ่ม/ปิดใช้งาน/เรียงลำดับ) และจัดการบัญชีผู้ใช้กับบทบาท"
    />
  );
}
