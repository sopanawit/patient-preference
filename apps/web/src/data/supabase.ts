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
import type {
  ActiveAdmission,
  Analysis,
  AnalysisItem,
  AnalysisStatus,
  Assignment,
  AuthSnapshot,
  Staff,
  StaffProfile,
  StaffRole,
} from "./model";
import { compareRooms } from "./sort";
import { APP_SETTING_KEYS } from "@patient-preference/shared";

// รูปแบบ row ของ analysis_assignments ที่ดึงมาประกอบ
interface Assignment2 {
  id: string;
  item_id: string;
  department_id: string;
  action_text: string;
  edited_by_reviewer: boolean;
}

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
        // นับเฉพาะเวอร์ชันปัจจุบัน (is_current) ให้ตรงกับคิวรอตรวจจริง
        // ไม่งั้นจะนับ analysis เวอร์ชันเก่าที่ยัง pending_review ค้างอยู่ด้วย
        count("preference_analysis", (q) =>
          q.eq("status", "pending_review").eq("is_current", true),
        ),
        isAdmin
          ? count("access_requests", (q) => q.eq("status", "pending"))
          : Promise.resolve(0),
      ]);
    return { patients, activeAdmissions, pendingReviews, pendingRequests };
  },
  async listActiveAdmissions(): Promise<ActiveAdmission[]> {
    const { data: adms } = await supabase
      .from("admissions")
      .select("id, hn, room, admit_date")
      .eq("status", "active");
    const rows = adms ?? [];
    if (rows.length === 0) return [];

    // ดึงชื่อคนไข้ของ HN ที่กำลังแอดมิทเป็นชุดเดียว แล้วประกอบเข้าด้วยกัน
    const hns = [...new Set(rows.map((a) => a.hn))];
    const { data: patientRows } = await supabase
      .from("patients")
      .select("hn, full_name")
      .in("hn", hns);
    const nameByHn = new Map(
      (patientRows ?? []).map((p) => [p.hn, p.full_name]),
    );

    return rows
      .map((a) => ({
        id: a.id,
        hn: a.hn,
        full_name: nameByHn.get(a.hn) ?? a.hn,
        room: a.room,
        admit_date: a.admit_date,
      }))
      .sort((a, b) => compareRooms(a.room, b.room));
  },
};

const access: AccessApi = {
  async createUser(input) {
    const { data, error } = await supabase.functions.invoke(
      "admin-create-user",
      { body: input },
    );
    if (error) {
      // non-2xx (เช่น 401/403/500) — พยายามอ่านข้อความจาก response
      let msg = "สร้างผู้ใช้ไม่สำเร็จ (สิทธิ์ไม่พอหรือเซิร์ฟเวอร์ผิดพลาด)";
      try {
        const ctx = (error as { context?: Response }).context;
        const body = ctx ? await ctx.json() : null;
        if (body?.error) msg = body.error;
      } catch {
        /* ใช้ข้อความ default */
      }
      return { error: msg };
    }
    if (data && data.ok === false) return { error: data.message ?? "สร้างผู้ใช้ไม่สำเร็จ" };
    return { error: null };
  },
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
      .select("id, full_name, role, is_active, department_id, line_user_id, email")
      .order("full_name", { ascending: true });
    return data ?? [];
  },
  async setActive(staffId, isActive) {
    await supabase.from("staff").update({ is_active: isActive }).eq("id", staffId);
  },
  async changeRole(staffId, role: StaffRole) {
    await supabase.from("staff").update({ role }).eq("id", staffId);
  },
  async updateUser(userId, patch) {
    const { data, error } = await supabase.functions.invoke(
      "admin-update-user",
      { body: { user_id: userId, ...patch } },
    );
    if (error) {
      let msg = "แก้ไขไม่สำเร็จ (สิทธิ์ไม่พอหรือเซิร์ฟเวอร์ผิดพลาด)";
      try {
        const ctx = (error as { context?: Response }).context;
        const body = ctx ? await ctx.json() : null;
        if (body?.error) msg = body.error;
      } catch {
        /* ใช้ข้อความ default */
      }
      return { error: msg };
    }
    if (data && data.ok === false)
      return { error: data.message ?? "แก้ไขไม่สำเร็จ" };
    return { error: null };
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

function splitTags(text: string | null): string[] {
  return (text ?? "")
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

async function audit(
  actor: string,
  action: string,
  entity: string,
  entityId: string,
  detail?: Record<string, unknown>,
): Promise<void> {
  // ไม่ให้ audit ล้มทำให้ mutation หลักล้ม (best-effort)
  await supabase
    .from("audit_log")
    .insert({ actor, action, entity, entity_id: entityId, detail })
    .then(undefined, () => {});
}

/** ประกอบ Analysis (nested items+assignments) จาก preference_analysis rows */
async function assembleAnalyses(
  rows: {
    id: string;
    hn: string;
    status: AnalysisStatus;
    is_current: boolean;
    generated_at: string;
  }[],
): Promise<Analysis[]> {
  if (rows.length === 0) return [];
  const analysisIds = rows.map((r) => r.id);
  const { data: itemRows } = await supabase
    .from("analysis_items")
    .select("id, analysis_id, source, original_text")
    .in("analysis_id", analysisIds);
  const items = itemRows ?? [];

  const itemIds = items.map((i) => i.id);
  const { data: asgRows } = itemIds.length
    ? await supabase
        .from("analysis_assignments")
        .select("id, item_id, department_id, action_text, edited_by_reviewer")
        .in("item_id", itemIds)
    : { data: [] as Assignment2[] };
  const assignments = (asgRows ?? []) as Assignment2[];

  const asgByItem = new Map<string, Assignment[]>();
  for (const a of assignments) {
    const arr = asgByItem.get(a.item_id) ?? [];
    arr.push({
      id: a.id,
      department_id: a.department_id,
      action_text: a.action_text,
      edited_by_reviewer: a.edited_by_reviewer,
    });
    asgByItem.set(a.item_id, arr);
  }

  const itemsByAnalysis = new Map<string, AnalysisItem[]>();
  for (const it of items) {
    const arr = itemsByAnalysis.get(it.analysis_id) ?? [];
    arr.push({
      id: it.id,
      source: it.source,
      original_text: it.original_text,
      assignments: asgByItem.get(it.id) ?? [],
    });
    itemsByAnalysis.set(it.analysis_id, arr);
  }

  return rows.map((r) => ({
    id: r.id,
    hn: r.hn,
    status: r.status,
    is_current: r.is_current,
    generated_at: r.generated_at,
    items: itemsByAnalysis.get(r.id) ?? [],
  }));
}

const patients: PatientsApi = {
  async getByHn(hn) {
    const { data } = await supabase
      .from("patients")
      .select("hn, full_name, likes_text, dislikes_text")
      .eq("hn", hn)
      .maybeSingle();
    if (!data) return null;
    return {
      hn: data.hn,
      full_name: data.full_name,
      likes_text: data.likes_text ?? "",
      dislikes_text: data.dislikes_text ?? "",
    };
  },

  async save({ hn, full_name, likes_text, dislikes_text, room, actorId }) {
    const { data: existing } = await supabase
      .from("patients")
      .select("hn, likes_text, dislikes_text")
      .eq("hn", hn)
      .maybeSingle();
    const prefsChanged =
      !existing ||
      (existing.likes_text ?? "") !== likes_text ||
      (existing.dislikes_text ?? "") !== dislikes_text;

    if (existing) {
      await supabase
        .from("patients")
        .update({ full_name, likes_text, dislikes_text, updated_by: actorId })
        .eq("hn", hn);
    } else {
      await supabase
        .from("patients")
        .insert({ hn, full_name, likes_text, dislikes_text, updated_by: actorId });
    }
    await audit(actorId, existing ? "update" : "create", "patient", hn, {
      prefsChanged,
    });

    // ห้องพัก: อัปเดต active admission หรือสร้างใหม่
    const { data: adm } = await supabase
      .from("admissions")
      .select("id, room")
      .eq("hn", hn)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (adm) {
      if (room && room !== adm.room) {
        await supabase.from("admissions").update({ room }).eq("id", adm.id);
        await audit(actorId, "update", "admission", adm.id, { room });
      }
    } else if (room) {
      const { data: newAdm } = await supabase
        .from("admissions")
        .insert({ hn, room, created_by: actorId })
        .select("id")
        .single();
      if (newAdm) await audit(actorId, "create", "admission", newAdm.id, { room });
    }

    // แก้ free text → regenerate analysis ผ่าน Edge Function (แยก transaction:
    // ถ้า AI ล้ม การบันทึกด้านบนยังอยู่ครบ — CLAUDE.md 7.3/8)
    if (prefsChanged) {
      try {
        await supabase.functions.invoke("classify-preferences", {
          body: { hn },
        });
      } catch {
        /* ไม่ให้การจัดหมวดที่ล้มทำให้การบันทึก free text ล้มตาม */
      }
    }
  },

  async view(hn) {
    const { data: patient } = await supabase
      .from("patients")
      .select("hn, full_name, likes_text, dislikes_text")
      .eq("hn", hn)
      .maybeSingle();
    if (!patient) return null;

    const { data: adm } = await supabase
      .from("admissions")
      .select("room")
      .eq("hn", hn)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: anaRows } = await supabase
      .from("preference_analysis")
      .select("id, hn, status, is_current, generated_at")
      .eq("hn", hn)
      .eq("is_current", true);
    const [analysis] = await assembleAnalyses(anaRows ?? []);

    return {
      patient: {
        hn: patient.hn,
        full_name: patient.full_name,
        likes_text: patient.likes_text ?? "",
        dislikes_text: patient.dislikes_text ?? "",
      },
      currentRoom: adm?.room ?? null,
      analysis: analysis ?? null,
    };
  },

  async currentAdmission(hn) {
    const { data } = await supabase
      .from("admissions")
      .select("id, hn, room, admit_date, status")
      .eq("hn", hn)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data ?? null;
  },

  async listActiveAdmissions() {
    const { data: admRows } = await supabase
      .from("admissions")
      .select("hn, room, admit_date, patients(full_name, likes_text, dislikes_text)")
      .eq("status", "active")
      .order("admit_date", { ascending: false })
      .order("created_at", { ascending: false });
    const rows = (admRows ?? []) as unknown as {
      hn: string;
      room: string;
      admit_date: string;
      patients: {
        full_name: string;
        likes_text: string | null;
        dislikes_text: string | null;
      } | null;
    }[];
    if (rows.length === 0) return [];

    // สถานะผลจัดหมวดปัจจุบันของแต่ละ HN (เวอร์ชัน is_current)
    const hns = [...new Set(rows.map((r) => r.hn))];
    const { data: anaRows } = await supabase
      .from("preference_analysis")
      .select("hn, status")
      .eq("is_current", true)
      .in("hn", hns);
    const statusByHn = new Map<string, AnalysisStatus>(
      ((anaRows ?? []) as { hn: string; status: AnalysisStatus }[]).map((a) => [
        a.hn,
        a.status,
      ]),
    );

    return rows.map((r) => ({
      hn: r.hn,
      full_name: r.patients?.full_name ?? r.hn,
      room: r.room,
      admit_date: r.admit_date,
      hasPreferences: Boolean(
        (r.patients?.likes_text ?? "").trim() ||
          (r.patients?.dislikes_text ?? "").trim(),
      ),
      analysisStatus: statusByHn.get(r.hn) ?? null,
    }));
  },

  async discharge(hn, actorId) {
    const { data: adm } = await supabase
      .from("admissions")
      .select("id")
      .eq("hn", hn)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!adm) return;
    await supabase
      .from("admissions")
      .update({ status: "discharged" })
      .eq("id", adm.id);
    await audit(actorId, "update", "admission", adm.id, { status: "discharged" });
  },

  async listPreferenceTags() {
    const { data } = await supabase
      .from("patients")
      .select("likes_text, dislikes_text");
    const likes = new Set<string>();
    const dislikes = new Set<string>();
    for (const p of data ?? []) {
      splitTags(p.likes_text).forEach((t) => likes.add(t));
      splitTags(p.dislikes_text).forEach((t) => dislikes.add(t));
    }
    return { likes: [...likes], dislikes: [...dislikes] };
  },
};

const analysis: AnalysisApi = {
  async listPending() {
    // RLS: pending_review เห็นได้เฉพาะ cx_manager/admin
    const { data } = await supabase
      .from("preference_analysis")
      .select("id, hn, status, is_current, generated_at")
      .eq("is_current", true)
      .eq("status", "pending_review")
      .order("generated_at", { ascending: true });
    return assembleAnalyses(data ?? []);
  },

  async addAssignment(itemId, input, actorId) {
    const { data } = await supabase
      .from("analysis_assignments")
      .insert({
        item_id: itemId,
        department_id: input.department_id,
        action_text: input.action_text,
        edited_by_reviewer: true,
      })
      .select("id")
      .single();
    if (data) await audit(actorId, "create", "analysis_assignment", data.id, { item_id: itemId });
  },

  async updateAssignment(assignmentId, patch, actorId) {
    await supabase
      .from("analysis_assignments")
      .update({ ...patch, edited_by_reviewer: true })
      .eq("id", assignmentId);
    await audit(actorId, "update", "analysis_assignment", assignmentId, patch);
  },

  async deleteAssignment(assignmentId, actorId) {
    await supabase
      .from("analysis_assignments")
      .delete()
      .eq("id", assignmentId);
    await audit(actorId, "delete", "analysis_assignment", assignmentId);
  },

  async confirm(analysisId, actorId) {
    await supabase
      .from("preference_analysis")
      .update({
        status: "confirmed",
        reviewed_by: actorId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", analysisId);
    await audit(actorId, "confirm", "analysis", analysisId);
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
