import type {
  STAFF_ROLES,
  ADMISSION_STATUSES,
  ANALYSIS_STATUSES,
  PREFERENCE_SOURCES,
  REQUEST_STATUSES,
  ASSIGNABLE_ROLES,
} from "./constants";

export type StaffRole = (typeof STAFF_ROLES)[number];
export type AdmissionStatus = (typeof ADMISSION_STATUSES)[number];
export type AnalysisStatus = (typeof ANALYSIS_STATUSES)[number];
export type PreferenceSource = (typeof PREFERENCE_SOURCES)[number];
export type RequestStatus = (typeof REQUEST_STATUSES)[number];
export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

/** เจ้าหน้าที่ (บัญชีจริง ผูก auth.users) */
export interface Staff {
  id: string;
  full_name: string;
  role: StaffRole;
  is_active: boolean;
  line_user_id: string | null;
  department_id: string | null;
}

/** คำขอเข้าใช้งาน (คิวรออนุมัติ ยื่นผ่าน LINE) */
export interface AccessRequest {
  id: string;
  line_user_id: string | null;
  full_name: string;
  department_id: string | null;
  note: string | null;
  status: RequestStatus;
  approved_role: StaffRole | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

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
