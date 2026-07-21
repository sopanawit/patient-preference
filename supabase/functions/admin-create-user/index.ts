// ============================================================================
// Edge Function: admin-create-user
// สร้างบัญชีเจ้าหน้าที่ (auth user + staff row) จากหน้าเว็บ admin
//
// ความปลอดภัย:
//   - ตรวจว่าผู้เรียกเป็น staff role=admin (active) ก่อนเสมอ
//   - ใช้ service role สร้าง auth user (คีย์อยู่ฝั่ง function เท่านั้น)
//   - verify_jwt=true (ต้อง login)
// ============================================================================
import { createClient } from "@supabase/supabase-js";

const VALID_ROLES = ["cs", "nurse", "cx_manager", "admin"];

const CORS: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers":
    "authorization, x-client-info, apikey, content-type",
  "access-control-allow-methods": "POST, OPTIONS",
};

interface Body {
  email?: string;
  full_name?: string;
  role?: string;
  department_id?: string | null;
  password?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return json({ error: "supabase env not configured" }, 500);

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });

  // ---- ตรวจสิทธิ์ผู้เรียก: ต้องเป็น admin ที่ active ----
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "unauthorized" }, 401);
  const { data: userData } = await admin.auth.getUser(
    authHeader.replace("Bearer ", ""),
  );
  const callerId = userData.user?.id;
  if (!callerId) return json({ error: "unauthorized" }, 401);
  const { data: caller } = await admin
    .from("staff")
    .select("role, is_active")
    .eq("id", callerId)
    .maybeSingle();
  if (!caller || !caller.is_active || caller.role !== "admin") {
    return json({ error: "forbidden — admin only" }, 403);
  }

  // ---- validate input ----
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid JSON body" }, 400);
  }
  const email = body.email?.trim().toLowerCase();
  const fullName = body.full_name?.trim();
  const role = body.role;
  const password = body.password ?? "";
  const departmentId = body.department_id || null;

  if (!email || !email.includes("@")) {
    return json({ ok: false, message: "อีเมลไม่ถูกต้อง" }, 200);
  }
  if (!fullName) {
    return json({ ok: false, message: "กรุณากรอกชื่อ-สกุล" }, 200);
  }
  if (!role || !VALID_ROLES.includes(role)) {
    return json({ ok: false, message: "role ไม่ถูกต้อง" }, 200);
  }
  if (password.length < 8) {
    return json({ ok: false, message: "รหัสผ่านต้องอย่างน้อย 8 ตัวอักษร" }, 200);
  }

  // ---- สร้าง auth user ----
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createErr || !created?.user) {
    const msg = createErr?.message ?? "สร้างบัญชีไม่สำเร็จ";
    const friendly = /already|exist|registered/i.test(msg)
      ? "อีเมลนี้มีบัญชีอยู่แล้ว"
      : msg;
    return json({ ok: false, message: friendly }, 200);
  }
  const newId = created.user.id;

  // ---- ผูก staff row ----
  const { error: staffErr } = await admin.from("staff").insert({
    id: newId,
    full_name: fullName,
    role,
    is_active: true,
    department_id: departmentId,
  });
  if (staffErr) {
    // rollback: ลบ auth user ที่เพิ่งสร้าง เพื่อไม่ให้ค้างครึ่งทาง
    await admin.auth.admin.deleteUser(newId).catch(() => {});
    return json({ ok: false, message: `ผูกสิทธิ์ไม่สำเร็จ: ${staffErr.message}` }, 200);
  }

  // ---- audit ----
  await admin.from("audit_log").insert({
    actor: callerId,
    action: "create",
    entity: "staff",
    entity_id: newId,
    detail: { email, role, department_id: departmentId },
  });

  return json({ ok: true, user_id: newId });
});

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json", ...CORS },
  });
}
