import { PlaceholderPage } from "@/components/PlaceholderPage";

/**
 * หน้าค้นด้วย HN — แสดงชื่อ/ห้อง/ความชอบ + action รายแผนก (ที่ confirmed แล้ว)
 * ดู CLAUDE.md ข้อ 11.2 / 7.5 · จะ implement ใน Phase 1 (free text) และ Phase 3 (gate action)
 */
export function SearchPage() {
  return (
    <PlaceholderPage
      title="ค้นด้วย HN"
      phase="Phase 1"
      description="ค้นด้วย HN แล้วแสดงชื่อ ห้องพักปัจจุบัน ความชอบ/ไม่ชอบ และ action รายแผนกที่ยืนยันแล้ว"
    />
  );
}
