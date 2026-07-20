// ============================================================================
// Data-access interfaces — UI พึ่งพา interface เหล่านี้เท่านั้น
// สลับ implementation (mock / supabase) ได้โดยไม่แตะ UI (ดู ./index.ts)
// ============================================================================
import type {
  AccessRequest,
  Admission,
  Analysis,
  AuthSnapshot,
  Department,
  Patient,
  PatientView,
  Staff,
  StaffProfile,
  StaffRole,
} from "./model";

export interface AuthApi {
  getCurrent(): Promise<AuthSnapshot>;
  onChange(cb: (snapshot: AuthSnapshot) => void): () => void;
  signIn(email: string, password: string): Promise<{ error: string | null }>;
  signOut(): Promise<void>;
}

export interface OverviewCounts {
  patients: number;
  activeAdmissions: number;
  pendingReviews: number;
  pendingRequests: number;
}

export interface PatientsApi {
  getByHn(hn: string): Promise<Patient | null>;
  /** สร้าง/แก้คนไข้ + ห้องพัก ; คืน analysis ที่ถูก (re)generate ถ้า likes/dislikes เปลี่ยน */
  save(input: {
    hn: string;
    full_name: string;
    likes_text: string;
    dislikes_text: string;
    room: string;
    actorId: string;
  }): Promise<void>;
  view(hn: string): Promise<PatientView | null>;
  currentAdmission(hn: string): Promise<Admission | null>;
  /** จำหน่ายคนไข้: ตั้ง admission ที่ active อยู่ของ HN นี้เป็น discharged */
  discharge(hn: string, actorId: string): Promise<void>;
  /** คำที่เคยกรอกทั้งระบบ (แยก like/dislike) — ใช้เป็นคลัง autocomplete */
  listPreferenceTags(): Promise<{ likes: string[]; dislikes: string[] }>;
}

export interface AnalysisApi {
  listPending(): Promise<Analysis[]>;
  /** CX เพิ่ม action รายแผนกให้ item เอง (ใช้เมื่อปิด AI — แบ่งแผนกด้วยมือ) */
  addAssignment(
    itemId: string,
    input: { department_id: string; action_text: string },
    actorId: string,
  ): Promise<void>;
  updateAssignment(
    assignmentId: string,
    patch: { action_text?: string; department_id?: string },
    actorId: string,
  ): Promise<void>;
  deleteAssignment(assignmentId: string, actorId: string): Promise<void>;
  confirm(analysisId: string, actorId: string): Promise<void>;
}

export interface DepartmentsApi {
  listActive(): Promise<Department[]>;
  listAll(): Promise<Department[]>;
  create(
    input: { code: string; name_th: string },
    actorId: string,
  ): Promise<void>;
  update(
    id: string,
    patch: Partial<Pick<Department, "name_th" | "is_active" | "sort_order">>,
    actorId: string,
  ): Promise<void>;
}

export interface AccessApi {
  listPendingRequests(): Promise<AccessRequest[]>;
  approve(
    requestId: string,
    role: StaffRole,
    actorId: string,
  ): Promise<void>;
  reject(requestId: string, actorId: string): Promise<void>;
  listStaff(): Promise<Staff[]>;
  setActive(staffId: string, isActive: boolean, actorId: string): Promise<void>;
  changeRole(staffId: string, role: StaffRole, actorId: string): Promise<void>;
}

export interface SettingsApi {
  getLineConfig(): Promise<Record<string, string>>;
  saveLineConfig(
    values: Record<string, string>,
    actorId: string,
  ): Promise<void>;
}

export interface DashboardApi {
  overview(isAdmin: boolean): Promise<OverviewCounts>;
}

export interface DataClient {
  auth: AuthApi;
  patients: PatientsApi;
  analysis: AnalysisApi;
  departments: DepartmentsApi;
  access: AccessApi;
  settings: SettingsApi;
  dashboard: DashboardApi;
}

export type { StaffProfile };
