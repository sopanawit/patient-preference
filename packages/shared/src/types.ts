import type {
  STAFF_ROLES,
  ADMISSION_STATUSES,
  ANALYSIS_STATUSES,
  PREFERENCE_SOURCES,
} from "./constants";

export type StaffRole = (typeof STAFF_ROLES)[number];
export type AdmissionStatus = (typeof ADMISSION_STATUSES)[number];
export type AnalysisStatus = (typeof ANALYSIS_STATUSES)[number];
export type PreferenceSource = (typeof PREFERENCE_SOURCES)[number];

/** แผนกปลายทาง (dynamic, admin จัดการได้) */
export interface Department {
  id: string;
  code: string;
  name_th: string;
  is_active: boolean;
  sort_order: number;
}

/**
 * รูปแบบ payload ที่ส่งเข้า Edge Function `classify-preferences`
 * (ดู CLAUDE.md ข้อ 8)
 */
export interface ClassifyRequest {
  hn: string;
  likes_text: string;
  dislikes_text: string;
  /** ส่งรายชื่อแผนก active จาก DB เข้าไปให้ prompt (ไม่ hardcode) */
  departments: Pick<Department, "code" | "name_th">[];
}

/** 1 action ที่ AI จัดให้แผนกหนึ่ง */
export interface AiAssignment {
  department_code: string;
  action: string;
}

/** 1 ความต้องการ → mapping หลายแผนกได้ */
export interface AiItem {
  source: PreferenceSource;
  original_text: string;
  assignments: AiAssignment[];
}

/** โครงสร้าง JSON ที่คาดหวังจากโมเดล (parse แล้วค่อยบันทึก) */
export interface ClassifyResponse {
  items: AiItem[];
}
