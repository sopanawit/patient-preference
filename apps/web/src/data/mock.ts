// ============================================================================
// Mock data-access implementation — in-memory store + seed + mock AI
// ใช้สำหรับ frontend-first: ทั้งแอปคลิกได้/เดโมได้โดยไม่ต้องมี backend จริง
// เปลี่ยนไปใช้ Supabase ภายหลังโดยสลับ VITE_DATA_BACKEND (ดู ./index.ts)
// ============================================================================
import type {
  AccessApi,
  AnalysisApi,
  AuthApi,
  DashboardApi,
  DataClient,
  DepartmentsApi,
  OverviewCounts,
  PatientsApi,
  SettingsApi,
} from "./api";
import type {
  AccessRequest,
  Admission,
  Analysis,
  AnalysisItem,
  AuthSnapshot,
  Department,
  Patient,
  PatientView,
  Staff,
  StaffProfile,
  StaffRole,
} from "./model";

let seq = 0;
const id = (prefix: string) => `${prefix}-${++seq}`;

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------
interface Store {
  departments: Department[];
  staff: Staff[];
  patients: Patient[];
  admissions: Admission[];
  analyses: Analysis[];
  requests: AccessRequest[];
  settings: Record<string, string>;
  emailToStaffId: Record<string, string>;
  currentUserId: string | null;
}

function seed(): Store {
  const dept = (code: string, name_th: string, sort: number): Department => ({
    id: id("dept"),
    code,
    name_th,
    is_active: true,
    sort_order: sort,
  });
  const housekeeping = dept("housekeeping", "แผนกแม่บ้าน", 10);
  const dietary = dept("dietary", "แผนกโภชนาการ", 20);
  const nursing = dept("nursing", "พยาบาลและแพทย์", 30);
  const other = dept("other", "อื่น ๆ", 99);
  const departments = [housekeeping, dietary, nursing, other];

  const admin: Staff = {
    id: id("staff"),
    full_name: "ผู้ดูแลระบบ",
    role: "admin",
    is_active: true,
    department_id: null,
    line_user_id: null,
  };
  const cx: Staff = {
    id: id("staff"),
    full_name: "คุณ CX",
    role: "cx_manager",
    is_active: true,
    department_id: nursing.id,
    line_user_id: "Umock_cx",
  };
  const nurse: Staff = {
    id: id("staff"),
    full_name: "พยาบาลสมหญิง",
    role: "nurse",
    is_active: true,
    department_id: nursing.id,
    line_user_id: "Umock_nurse",
  };

  const store: Store = {
    departments,
    staff: [admin, cx, nurse],
    patients: [],
    admissions: [],
    analyses: [],
    requests: [
      {
        id: id("req"),
        full_name: "สมชาย รักงาน",
        department_id: housekeeping.id,
        note: "ขอเข้าใช้งานจากเมนู LINE",
        status: "pending",
        created_at: new Date().toISOString(),
      },
      {
        id: id("req"),
        full_name: "มานี มีสุข",
        department_id: dietary.id,
        note: null,
        status: "pending",
        created_at: new Date().toISOString(),
      },
    ],
    settings: { line_liff_id: "", line_channel_id: "", line_channel_secret: "" },
    emailToStaffId: {
      "admin@hospital.local": admin.id,
      "cx@hospital.local": cx.id,
      "nurse@hospital.local": nurse.id,
    },
    currentUserId: null,
  };

  // คนไข้ตัวอย่าง A — มี analysis ที่ confirmed แล้ว
  store.patients.push({
    hn: "HN0001",
    full_name: "วิภา ทองดี",
    likes_text: "ชอบดูทีวีมาก มักขอทีวีเคลื่อนที่",
    dislikes_text: "ไม่ชอบเสียงดัง",
  });
  store.admissions.push({
    id: id("adm"),
    hn: "HN0001",
    room: "301/A",
    admit_date: new Date().toISOString().slice(0, 10),
    status: "active",
  });
  const confirmed = classify(
    "HN0001",
    "ชอบดูทีวีมาก มักขอทีวีเคลื่อนที่",
    "ไม่ชอบเสียงดัง",
    departments,
  );
  confirmed.status = "confirmed";
  // ตัวอย่าง action ที่ CX แบ่งแผนกเอง (เดโม flow แบบไม่มี AI)
  confirmed.items[0]?.assignments.push({
    id: id("asg"),
    department_id: housekeeping.id,
    action_text: "เตรียมทีวีเคลื่อนที่ไว้ในห้องพักก่อนคนไข้เข้า",
    edited_by_reviewer: true,
  });
  confirmed.items[1]?.assignments.push({
    id: id("asg"),
    department_id: nursing.id,
    action_text: "เข้าห้องพูดคุยด้วยเสียงเบา ลดการรบกวน",
    edited_by_reviewer: true,
  });
  store.analyses.push(confirmed);

  // คนไข้ตัวอย่าง B — analysis ยังรอตรวจ (pending_review)
  store.patients.push({
    hn: "HN0002",
    full_name: "ธนา ใจเย็น",
    likes_text: "ชอบห้องที่มีแสงธรรมชาติ\nชอบน้ำอุ่น",
    dislikes_text: "ไม่ชอบอาหารรสจัด",
  });
  store.admissions.push({
    id: id("adm"),
    hn: "HN0002",
    room: "205",
    admit_date: new Date().toISOString().slice(0, 10),
    status: "active",
  });
  store.analyses.push(
    classify(
      "HN0002",
      "ชอบห้องที่มีแสงธรรมชาติ\nชอบน้ำอุ่น",
      "ไม่ชอบอาหารรสจัด",
      departments,
    ),
  );

  return store;
}

// ---------------------------------------------------------------------------
// แตกรายการความต้องการ (ปิด AI แบ่งแผนกแล้ว — CX แบ่งเองในหน้าคิวรอตรวจ)
// แค่แยก likes/dislikes เป็น items ต่อบรรทัด ไม่มี assignment เริ่มต้น
// ---------------------------------------------------------------------------
function classify(
  hn: string,
  likes: string,
  dislikes: string,
  _departments: Department[],
): Analysis {
  const makeItems = (text: string, source: "like" | "dislike"): AnalysisItem[] =>
    text
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((line) => ({
        id: id("item"),
        source,
        original_text: line,
        assignments: [],
      }));

  return {
    id: id("ana"),
    hn,
    status: "pending_review",
    is_current: true,
    generated_at: new Date().toISOString(),
    items: [...makeItems(likes, "like"), ...makeItems(dislikes, "dislike")],
  };
}

// ---------------------------------------------------------------------------
// สร้าง store + implementation
// ---------------------------------------------------------------------------
const db: Store = seed();
const authListeners = new Set<(s: AuthSnapshot) => void>();

function profileOf(userId: string | null): StaffProfile | null {
  if (!userId) return null;
  const s = db.staff.find((x) => x.id === userId);
  if (!s) return null;
  return {
    id: s.id,
    full_name: s.full_name,
    role: s.role,
    is_active: s.is_active,
    department_id: s.department_id,
  };
}

function snapshot(): AuthSnapshot {
  return { userId: db.currentUserId, profile: profileOf(db.currentUserId) };
}

function notifyAuth() {
  const s = snapshot();
  authListeners.forEach((cb) => cb(s));
}

const auth: AuthApi = {
  async getCurrent() {
    return snapshot();
  },
  onChange(cb) {
    authListeners.add(cb);
    return () => authListeners.delete(cb);
  },
  async signIn(email) {
    const staffId = db.emailToStaffId[email.trim().toLowerCase()];
    if (!staffId) {
      // mock: อีเมลที่ไม่รู้จัก → ล็อกอินเป็น admin เพื่อความสะดวกในการเดโม
      db.currentUserId = db.staff.find((s) => s.role === "admin")?.id ?? null;
    } else {
      db.currentUserId = staffId;
    }
    notifyAuth();
    return { error: null };
  },
  async signOut() {
    db.currentUserId = null;
    notifyAuth();
  },
};

const patients: PatientsApi = {
  async getByHn(hn) {
    return db.patients.find((p) => p.hn === hn) ?? null;
  },
  async currentAdmission(hn) {
    return (
      db.admissions.find((a) => a.hn === hn && a.status === "active") ?? null
    );
  },
  async discharge(hn) {
    const adm = db.admissions.find((a) => a.hn === hn && a.status === "active");
    if (adm) adm.status = "discharged";
  },
  async listPreferenceTags() {
    const collect = (key: "likes_text" | "dislikes_text") => {
      const seen = new Set<string>();
      for (const p of db.patients) {
        for (const t of (p[key] ?? "")
          .split(/[\n,]/)
          .map((s) => s.trim())
          .filter(Boolean)) {
          seen.add(t);
        }
      }
      return [...seen];
    };
    return { likes: collect("likes_text"), dislikes: collect("dislikes_text") };
  },
  async save({ hn, full_name, likes_text, dislikes_text, room }) {
    const existing = db.patients.find((p) => p.hn === hn);
    const changed =
      !existing ||
      existing.likes_text !== likes_text ||
      existing.dislikes_text !== dislikes_text;

    if (existing) {
      existing.full_name = full_name;
      existing.likes_text = likes_text;
      existing.dislikes_text = dislikes_text;
    } else {
      db.patients.push({ hn, full_name, likes_text, dislikes_text });
    }

    // ห้องพัก: อัปเดต active admission ล่าสุด หรือสร้างใหม่
    const adm = db.admissions.find((a) => a.hn === hn && a.status === "active");
    if (adm) {
      adm.room = room;
    } else if (room) {
      db.admissions.push({
        id: id("adm"),
        hn,
        room,
        admit_date: new Date().toISOString().slice(0, 10),
        status: "active",
      });
    }

    // แก้ free text → regenerate analysis + เด้งกลับ pending_review (CLAUDE.md 7.4)
    if (changed) {
      db.analyses
        .filter((a) => a.hn === hn)
        .forEach((a) => (a.is_current = false));
      db.analyses.push(
        classify(hn, likes_text, dislikes_text, db.departments),
      );
    }
  },
  async view(hn) {
    const patient = db.patients.find((p) => p.hn === hn);
    if (!patient) return null;
    const adm = db.admissions.find(
      (a) => a.hn === hn && a.status === "active",
    );
    const analysis =
      db.analyses.find((a) => a.hn === hn && a.is_current) ?? null;
    return {
      patient,
      currentRoom: adm?.room ?? null,
      analysis,
    } satisfies PatientView;
  },
};

const analysis: AnalysisApi = {
  async listPending() {
    return db.analyses.filter((a) => a.is_current && a.status === "pending_review");
  },
  async addAssignment(itemId, input) {
    for (const a of db.analyses)
      for (const item of a.items)
        if (item.id === itemId) {
          item.assignments.push({
            id: id("asg"),
            department_id: input.department_id,
            action_text: input.action_text,
            edited_by_reviewer: true,
          });
        }
  },
  async updateAssignment(assignmentId, patch) {
    for (const a of db.analyses)
      for (const item of a.items)
        for (const asg of item.assignments)
          if (asg.id === assignmentId) {
            if (patch.action_text !== undefined)
              asg.action_text = patch.action_text;
            if (patch.department_id !== undefined)
              asg.department_id = patch.department_id;
            asg.edited_by_reviewer = true;
          }
  },
  async deleteAssignment(assignmentId) {
    for (const a of db.analyses)
      for (const item of a.items)
        item.assignments = item.assignments.filter((x) => x.id !== assignmentId);
  },
  async confirm(analysisId) {
    const a = db.analyses.find((x) => x.id === analysisId);
    if (a) a.status = "confirmed";
  },
};

const departments: DepartmentsApi = {
  async listActive() {
    return db.departments
      .filter((d) => d.is_active)
      .sort((a, b) => a.sort_order - b.sort_order);
  },
  async listAll() {
    return [...db.departments].sort((a, b) => a.sort_order - b.sort_order);
  },
  async create({ code, name_th }) {
    db.departments.push({
      id: id("dept"),
      code,
      name_th,
      is_active: true,
      sort_order: (db.departments.at(-1)?.sort_order ?? 0) + 10,
    });
  },
  async update(deptId, patch) {
    const d = db.departments.find((x) => x.id === deptId);
    if (d) Object.assign(d, patch);
  },
};

const access: AccessApi = {
  async listPendingRequests() {
    return db.requests.filter((r) => r.status === "pending");
  },
  async createUser({ email, full_name, role, department_id, password }) {
    const key = email.trim().toLowerCase();
    if (!key.includes("@")) return { error: "อีเมลไม่ถูกต้อง" };
    if (password.length < 8)
      return { error: "รหัสผ่านต้องอย่างน้อย 8 ตัวอักษร" };
    if (db.emailToStaffId[key]) return { error: "อีเมลนี้มีบัญชีอยู่แล้ว" };
    const staffId = id("staff");
    db.staff.push({
      id: staffId,
      full_name: full_name.trim(),
      role,
      is_active: true,
      department_id,
      line_user_id: null,
    });
    db.emailToStaffId[key] = staffId;
    return { error: null };
  },
  async approve(requestId) {
    const r = db.requests.find((x) => x.id === requestId);
    if (r) r.status = "approved";
  },
  async reject(requestId) {
    const r = db.requests.find((x) => x.id === requestId);
    if (r) r.status = "rejected";
  },
  async listStaff() {
    return [...db.staff].sort((a, b) => a.full_name.localeCompare(b.full_name));
  },
  async setActive(staffId, isActive) {
    const s = db.staff.find((x) => x.id === staffId);
    if (s) s.is_active = isActive;
  },
  async changeRole(staffId, role: StaffRole) {
    const s = db.staff.find((x) => x.id === staffId);
    if (s) s.role = role;
  },
};

const settings: SettingsApi = {
  async getLineConfig() {
    return { ...db.settings };
  },
  async saveLineConfig(values) {
    Object.assign(db.settings, values);
  },
};

const dashboard: DashboardApi = {
  async overview(isAdmin): Promise<OverviewCounts> {
    return {
      patients: db.patients.length,
      activeAdmissions: db.admissions.filter((a) => a.status === "active")
        .length,
      pendingReviews: db.analyses.filter(
        (a) => a.is_current && a.status === "pending_review",
      ).length,
      pendingRequests: isAdmin
        ? db.requests.filter((r) => r.status === "pending").length
        : 0,
    };
  },
};

export const mockClient: DataClient = {
  auth,
  patients,
  analysis,
  departments,
  access,
  settings,
  dashboard,
};
