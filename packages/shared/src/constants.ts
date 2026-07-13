/**
 * ค่าคงที่ที่ใช้ร่วมกันระหว่าง frontend และ Edge Function
 * หมายเหตุ: รายชื่อ "แผนกปลายทาง" จริง ๆ เป็น dynamic อยู่ในตาราง `departments`
 * (ดู CLAUDE.md ข้อ 7.3) — ห้าม hardcode รายชื่อแผนกในโค้ด
 * ค่าด้านล่างเป็นเพียง code ของ seed เริ่มต้น เพื่อใช้อ้างอิง fallback `other`
 */

/** บทบาทของเจ้าหน้าที่ (ตรงกับ enum `staff_role` ใน DB) */
export const STAFF_ROLES = ["cs", "nurse", "cx_manager", "admin"] as const;

/** สถานะการแอดมิท (ตรงกับ enum `admission_status`) */
export const ADMISSION_STATUSES = ["active", "discharged"] as const;

/** สถานะผลการจัดหมวด (ตรงกับ enum `analysis_status`) */
export const ANALYSIS_STATUSES = ["pending_review", "confirmed"] as const;

/** สถานะคำขอเข้าใช้งาน (ตรงกับ enum `request_status`) */
export const REQUEST_STATUSES = ["pending", "approved", "rejected"] as const;

/** role ที่ admin กำหนดให้ผู้ขอผ่าน LINE ได้ (ไม่รวม admin) */
export const ASSIGNABLE_ROLES = ["cs", "nurse", "cx_manager"] as const;

/** key ของค่าตั้งค่าใน app_settings (LINE config) */
export const APP_SETTING_KEYS = [
  "line_liff_id",
  "line_channel_id",
  "line_channel_secret",
] as const;

/** label ภาษาไทยของแต่ละ role */
export const ROLE_LABELS: Record<string, string> = {
  cs: "Customer Service",
  nurse: "พยาบาล",
  cx_manager: "CX Manager",
  admin: "ผู้ดูแลระบบ",
};

/** ที่มาของความต้องการ (ช่อง likes / dislikes) */
export const PREFERENCE_SOURCES = ["like", "dislike"] as const;

/** code ของหมวด catch-all — ต้องมีอยู่ใน `departments` เสมอ (ใช้ fallback) */
export const OTHER_DEPARTMENT_CODE = "other";

/**
 * ข้อความ hint กำกับช่อง free text (ดู CLAUDE.md ข้อ 7.1 / 9)
 * ย้ำผู้กรอกว่ากรอกเฉพาะเรื่อง non-medical
 */
export const NON_MEDICAL_HINT =
  "กรอกเฉพาะเรื่องทั่วไป เช่น สภาพห้อง สิ่งอำนวยความสะดวก การสื่อสาร — ห้ามกรอกอาการป่วย/การวินิจฉัย/การรักษา";
