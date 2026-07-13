import { PlaceholderPage } from "@/components/PlaceholderPage";

/**
 * คิวรอตรวจ (CX Manager) — รายการ pending_review + ตัวแก้ action + ปุ่มยืนยัน
 * ดู CLAUDE.md ข้อ 11.3 / 7.6 · จะ implement ใน Phase 3 · เข้าถึงได้เฉพาะ cx_manager/admin
 */
export function ReviewPage() {
  return (
    <PlaceholderPage
      title="คิวรอตรวจ (CX)"
      phase="Phase 3"
      description="รายการผลจัดหมวดที่รอตรวจ ดู original_text คู่กับ action ที่ AI เสนอ แก้/ย้ายแผนก/ลบ แล้วกดยืนยัน"
    />
  );
}
