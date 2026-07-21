// ============================================================================
// Edge Function: admin-update-user
// แก้ไขข้อมูลบัญชีเจ้าหน้าที่ (ชื่อ / อีเมลล็อกอิน / แผนก) จากหน้าเว็บ admin
//
// ความปลอดภัย:
//   - ตรวจว่าผู้เรียกเป็น staff role=admin (active) ก่อนเสมอ
//   - แก้อีเมลใน auth.users ด้วย service role (คีย์อยู่ฝั่ง function เท่านั้น)
//   - sync อีเมล (denormalized) ลงตาราง staff ด้วย
// ============================================================================
import { createClient } from "@supabase/supabase-js";

const CORS: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers":
    "authorization, x-client-info, apikey, content-type",
  "access-control-allow-methods": "POST, OPTIONS",
};

interface Body {
  user_id?: string;
  full_name?: string;
  email?: string;
  department_id?: string | null;
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

  // ---- validate ----
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid JSON body" }, 400);
  }
  const targetId = body.user_id;
  if (!targetId) return json({ ok: false, message: "ไม่พบ user_id" }, 200);

  const fullName = body.full_name?.trim();
  const email = body.email?.trim().toLowerCase();
  const hasEmail = email !== undefined && email !== "";
  const hasDept = Object.prototype.hasOwnProperty.call(body, "department_id");

  if (fullName !== undefined && fullName === "") {
    return json({ ok: false, message: "ชื่อ-สกุลห้ามว่าง" }, 200);
  }
  if (hasEmail && !email!.includes("@")) {
    return json({ ok: false, message: "อีเมลไม่ถูกต้อง" }, 200);
  }

  // ---- อัปเดตอีเมลใน auth.users (ถ้ามี) ----
  if (hasEmail) {
    const { error: authErr } = await admin.auth.admin.updateUserById(targetId, {
      email: email!,
      email_confirm: true,
    });
    if (authErr) {
      const msg = authErr.message ?? "แก้อีเมลไม่สำเร็จ";
      const friendly = /already|exist|registered|duplicate/i.test(msg)
        ? "อีเมลนี้มีบัญชีอื่นใช้อยู่แล้ว"
        : msg;
      return json({ ok: false, message: friendly }, 200);
    }
  }

  // ---- อัปเดตตาราง staff ----
  const patch: Record<string, unknown> = {};
  if (fullName !== undefined) patch.full_name = fullName;
  if (hasEmail) patch.email = email;
  if (hasDept) patch.department_id = body.department_id || null;
  if (Object.keys(patch).length > 0) {
    const { error: staffErr } = await admin
      .from("staff")
      .update(patch)
      .eq("id", targetId);
    if (staffErr) return json({ ok: false, message: staffErr.message }, 200);
  }

  await admin.from("audit_log").insert({
    actor: callerId,
    action: "update",
    entity: "staff",
    entity_id: targetId,
    detail: {
      full_name: fullName,
      email: hasEmail ? email : undefined,
      department_id: hasDept ? body.department_id || null : undefined,
    },
  });

  return json({ ok: true });
});

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json", ...CORS },
  });
}
