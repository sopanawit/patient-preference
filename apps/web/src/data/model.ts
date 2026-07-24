// ============================================================================
// Domain / view types สำหรับ data-access layer
// อ้างอิง schema ใน CLAUDE.md — ใช้ร่วมกันทั้ง mock และ supabase implementation
// ============================================================================
import type {
  StaffRole,
  AdmissionStatus,
  AnalysisStatus,
  RequestStatus,
} from "@/types/database";

export type {
  StaffRole,
  AdmissionStatus,
  AnalysisStatus,
  RequestStatus,
} from "@/types/database";

export interface StaffProfile {
  id: string;
  full_name: string;
  role: StaffRole;
  is_active: boolean;
  department_id: string | null;
}

/** สถานะ auth ปัจจุบัน (นามธรรม ไม่ผูกกับ Supabase Session โดยตรง) */
export interface AuthSnapshot {
  userId: string | null;
  profile: StaffProfile | null;
}

export interface Department {
  id: string;
  code: string;
  name_th: string;
  is_active: boolean;
  sort_order: number;
}

export interface Patient {
  hn: string;
  full_name: string;
  likes_text: string;
  dislikes_text: string;
}

export interface Admission {
  id: string;
  hn: string;
  room: string;
  admit_date: string;
  status: AdmissionStatus;
}

export interface Assignment {
  id: string;
  department_id: string;
  action_text: string;
  edited_by_reviewer: boolean;
}

export interface AnalysisItem {
  id: string;
  source: "like" | "dislike";
  original_text: string;
  assignments: Assignment[];
}

/** ผลจัดหมวดของ HN หนึ่ง (version current) พร้อม items+assignments */
export interface Analysis {
  id: string;
  hn: string;
  status: AnalysisStatus;
  is_current: boolean;
  generated_at: string;
  items: AnalysisItem[];
}

export interface Staff {
  id: string;
  full_name: string;
  role: StaffRole;
  is_active: boolean;
  department_id: string | null;
  line_user_id: string | null;
  email?: string | null;
}

export interface AccessRequest {
  id: string;
  full_name: string;
  department_id: string | null;
  note: string | null;
  status: RequestStatus;
  created_at: string;
}

/** มุมมองรวมสำหรับหน้าค้นหา (search) */
export interface PatientView {
  patient: Patient;
  currentRoom: string | null;
  analysis: Analysis | null;
}

/** รายการหนึ่งแถวในหน้ารายชื่อคนที่กำลังแอดมิท */
export interface AdmittedPatient {
  hn: string;
  full_name: string;
  room: string;
  admit_date: string;
  /** มีความชอบ/ไม่ชอบกรอกไว้หรือยัง */
  hasPreferences: boolean;
  /** สถานะผลจัดหมวดของ HN นี้ (null = ยังไม่มีผลจัดหมวด) */
  analysisStatus: AnalysisStatus | null;
}
