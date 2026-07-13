// ============================================================================
// Supabase data-access implementation
// ครอบส่วนที่วางสายไว้แล้ว (auth, access, settings, departments, dashboard)
// ส่วน patients/analysis เป็น backend ที่จะทำในเฟสถัดไป → โยน error ชัดเจน
// (default backend = mock ดังนั้นยังไม่ถูกเรียกจนกว่าจะสลับ VITE_DATA_BACKEND)
// ============================================================================
import { supabase } from "@/lib/supabase";
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
import type { AuthSnapshot, Staff, StaffProfile, StaffRole } from "./model";
import { APP_SETTING_KEYS } from "@patient-preference/shared";

const BACKEND_TODO = "Supabase backend สำหรับส่วนนี้ยังไม่ทำ (จะทำในเฟส backend)";

// facade ที่ระบุ type ของ auth surface ที่เราใช้เอง — ไม่พึ่งการ resolve type ของ
// transitive deps ของ supabase-js (บาง environment เช่น CI resolve type ของ
// @supabase/auth-js ไม่ครบ ทำให้ .auth เสีย method) เมธอดเหล่านี้มีจริงตอน runtime
type SessionUser = { id: string };
interface AuthFacade {
  getSession(): Promise<{ data: { session: { user: SessionUser } | null } }>;
  onAuthStateChange(
    cb: (event: string, session: { user: SessionUser } | null) => void,
  ): { data: { subscription: { unsubscribe(): void } } };
  signInWithPassword(creds: {
    email: string;
    password: string;
  }): Promise<{ error: { message: string } | null }>;
  signOut(): Promise<unknown>;
}
const sbAuth = (): AuthFacade => supabase.auth as unknown as AuthFacade;

async function fetchProfile(userId: string): Promise<StaffProfile | null> {
  const { data } = await supabase
    .from("staff")
    .select("id, full_name, role, is_active, department_id")
    .eq("id", userId)
    .maybeSingle();
  return data ?? null;
}

const auth: AuthApi = {
  async getCurrent(): Promise<AuthSnapshot> {
    const { data } = await sbAuth().getSession();
    const userId = data.session?.user.id ?? null;
    return { userId, profile: userId ? await fetchProfile(userId) : null };
  },
  onChange(cb) {
    const { data } = sbAuth().onAuthStateChange((_e, session) => {
      const userId = session?.user.id ?? null;
      void (async () => {
        cb({ userId, profile: userId ? await fetchProfile(userId) : null });
      })();
    });
    return () => data.subscription.unsubscribe();
  },
  async signIn(email, password) {
    const { error } = await sbAuth().signInWithPassword({ email, password });
    return { error: error ? error.message : null };
  },
  async signOut() {
    await sbAuth().signOut();
  },
};

async function count(
  table: "patients" | "admissions" | "preference_analysis" | "access_requests",
  apply?: (q: ReturnType<typeof headCount>) => ReturnType<typeof headCount>,
): Promise<number> {
  let q = headCount(table);
  if (apply) q = apply(q);
  const { count: c } = await q;
  return c ?? 0;
}
function headCount(table: string) {
  return supabase.from(table).select("*", { count: "exact", head: true });
}

const dashboard: DashboardApi = {
  async overview(isAdmin): Promise<OverviewCounts> {
    const [patients, activeAdmissions, pendingReviews, pendingRequests] =
      await Promise.all([
        count("patients"),
        count("admissions", (q) => q.eq("status", "active")),
        count("preference_analysis", (q) => q.eq("status", "pending_review")),
        isAdmin
          ? count("access_requests", (q) => q.eq("status", "pending"))
          : Promise.resolve(0),
      ]);
    return { patients, activeAdmissions, pendingReviews, pendingRequests };
  },
};

const access: AccessApi = {
  async listPendingRequests() {
    const { data } = await supabase
      .from("access_requests")
      .select("id, full_name, department_id, note, status, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: true });
    return data ?? [];
  },
  async approve(requestId, role, actorId) {
    await supabase
      .from("access_requests")
      .update({
        status: "approved",
        approved_role: role,
        reviewed_by: actorId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", requestId);
  },
  async reject(requestId, actorId) {
    await supabase
      .from("access_requests")
      .update({
        status: "rejected",
        reviewed_by: actorId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", requestId);
  },
  async listStaff(): Promise<Staff[]> {
    const { data } = await supabase
      .from("staff")
      .select("id, full_name, role, is_active, department_id, line_user_id")
      .order("full_name", { ascending: true });
    return data ?? [];
  },
  async setActive(staffId, isActive) {
    await supabase.from("staff").update({ is_active: isActive }).eq("id", staffId);
  },
  async changeRole(staffId, role: StaffRole) {
    await supabase.from("staff").update({ role }).eq("id", staffId);
  },
};

const settings: SettingsApi = {
  async getLineConfig() {
    const { data } = await supabase.from("app_settings").select("key, value");
    const rows = (data ?? []) as { key: string; value: string }[];
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  },
  async saveLineConfig(values, actorId) {
    await Promise.all(
      APP_SETTING_KEYS.map((key) =>
        supabase
          .from("app_settings")
          .update({ value: values[key] ?? "", updated_by: actorId })
          .eq("key", key),
      ),
    );
  },
};

const departments: DepartmentsApi = {
  async listActive() {
    const { data } = await supabase
      .from("departments")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    return data ?? [];
  },
  async listAll() {
    const { data } = await supabase
      .from("departments")
      .select("*")
      .order("sort_order", { ascending: true });
    return data ?? [];
  },
  async create({ code, name_th }) {
    await supabase.from("departments").insert({ code, name_th });
  },
  async update(deptId, patch) {
    await supabase.from("departments").update(patch).eq("id", deptId);
  },
};

const patients: PatientsApi = {
  async getByHn() {
    throw new Error(BACKEND_TODO);
  },
  async save() {
    throw new Error(BACKEND_TODO);
  },
  async view() {
    throw new Error(BACKEND_TODO);
  },
  async currentAdmission() {
    throw new Error(BACKEND_TODO);
  },
};

const analysis: AnalysisApi = {
  async listPending() {
    throw new Error(BACKEND_TODO);
  },
  async updateAssignment() {
    throw new Error(BACKEND_TODO);
  },
  async deleteAssignment() {
    throw new Error(BACKEND_TODO);
  },
  async confirm() {
    throw new Error(BACKEND_TODO);
  },
};

export const supabaseClient: DataClient = {
  auth,
  patients,
  analysis,
  departments,
  access,
  settings,
  dashboard,
};
