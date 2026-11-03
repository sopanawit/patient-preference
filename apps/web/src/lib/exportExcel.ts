// ============================================================================
// Export ข้อมูลคนไข้ทั้งหมดเป็นไฟล์ Excel (.xlsx) — ใช้ในหน้า admin เท่านั้น
// สร้างไฟล์ฝั่ง client ด้วย SheetJS แล้วสั่งดาวน์โหลด
// ============================================================================
import * as XLSX from "xlsx";
import type { PatientExportRow } from "@/data";

/** รวม tag ที่คั่นด้วย \n/comma ให้อยู่บรรทัดเดียวอ่านง่ายในเซลล์ */
function oneLine(text: string): string {
  return text
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .join(", ");
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function exportPatientsToExcel(rows: PatientExportRow[]): void {
  const header = [
    "HN",
    "ชื่อ-สกุล",
    "ห้องพักปัจจุบัน",
    "สิ่งที่ชอบ",
    "สิ่งที่ไม่ชอบ",
    "ผู้บันทึกล่าสุด",
    "วันที่บันทึก",
  ];
  const body = rows.map((r) => [
    r.hn,
    r.full_name,
    r.room ?? "",
    oneLine(r.likes_text),
    oneLine(r.dislikes_text),
    r.saved_by_name ?? "",
    formatDate(r.saved_at),
  ]);

  const ws = XLSX.utils.aoa_to_sheet([header, ...body]);
  ws["!cols"] = [
    { wch: 12 },
    { wch: 24 },
    { wch: 14 },
    { wch: 44 },
    { wch: 44 },
    { wch: 20 },
    { wch: 16 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "คนไข้");
  const today = new Date().toISOString().slice(0, 10);
  // writeFile สร้างไฟล์ + สั่งดาวน์โหลดในเบราว์เซอร์
  XLSX.writeFile(wb, `patients-${today}.xlsx`);
}
