import { PlaceholderPage } from "@/components/PlaceholderPage";

/**
 * หน้ากรอกข้อมูล — HN, ชื่อ-สกุล, ห้องพัก, likes, dislikes (+ hint non-medical)
 * ดู CLAUDE.md ข้อ 11.1 · จะ implement ใน Phase 1
 */
export function EntryPage() {
  return (
    <PlaceholderPage
      title="กรอกข้อมูลคนไข้"
      phase="Phase 1"
      description="กรอก HN, ชื่อ-สกุล, ห้องพัก และความชอบ/ไม่ชอบ (free text) พร้อม hint non-medical; HN เดิมจะ auto-fill ความชอบ"
    />
  );
}
