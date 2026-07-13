import { supabase } from "@/lib/supabase";

/**
 * เขียน audit_log ในนามผู้ใช้ปัจจุบัน (ตาม convention CLAUDE.md ข้อ 14)
 * actor ถูกกำหนดเป็น auth.uid() ของผู้เรียกโดย RLS policy `audit_log_insert_self`
 */
export async function recordAudit(
  actorId: string,
  action: string,
  entity: string,
  entityId: string,
  detail?: Record<string, unknown>,
): Promise<void> {
  await supabase.from("audit_log").insert({
    actor: actorId,
    action,
    entity,
    entity_id: entityId,
    detail: detail ?? null,
  });
}
