// ============================================================================
// Edge Function: classify-preferences
// จัดหมวดความต้องการ non-medical ของคนไข้เป็น action รายแผนกด้วย Claude Opus 4.8
// อ้างอิง CLAUDE.md ข้อ 8 (AI Integration)
//
// สถานะ: SCAFFOLD (Phase 0) — โครง contract + validation พร้อมแล้ว
//         การเรียกโมเดลจริงจะทำใน Phase 2 (ดู TODO ด้านล่าง)
//
// กติกาสำคัญ:
//   - ANTHROPIC_API_KEY อยู่ใน env ของ function เท่านั้น ห้าม expose ฝั่ง client
//   - รายชื่อแผนกเป็น dynamic — ดึงจาก DB ส่งเข้า prompt ไม่ hardcode
//   - department_code ที่โมเดลตอบต้องมีจริงใน DB ไม่งั้น fallback เป็น 'other'
// ============================================================================

interface AiAssignment {
  department_code: string;
  action: string;
}
interface AiItem {
  source: "like" | "dislike";
  original_text: string;
  assignments: AiAssignment[];
}
interface ClassifyRequest {
  hn: string;
  likes_text: string;
  dislikes_text: string;
  departments: { code: string; name_th: string }[];
}

const MODEL = "claude-opus-4-8";

const OTHER_DEPARTMENT_CODE = "other";

/** สร้าง system prompt โดยฝังรายชื่อแผนก (dynamic) — ดู CLAUDE.md ข้อ 8 */
function buildSystemPrompt(departments: ClassifyRequest["departments"]): string {
  const deptList = departments
    .map((d) => `- ${d.code}: ${d.name_th}`)
    .join("\n");
  return [
    "คุณเป็นผู้ช่วยจัดความต้องการพิเศษแบบ non-medical ของคนไข้ในโรงพยาบาล",
    "หน้าที่: แปลงความชอบ/ไม่ชอบเป็น action ที่แต่ละแผนกทำได้จริง โดยเลือกจากหมวดที่ให้เท่านั้น",
    "",
    "หมวดแผนกปลายทางที่ใช้ได้ (department_code: ชื่อ):",
    deptList,
    "",
    "กติกา:",
    "- ผลลัพธ์เป็นภาษาไทย และเป็น action ที่ปฏิบัติได้จริง",
    "- ความต้องการหนึ่งข้อ แมปได้หลายแผนก",
    `- ถ้าจัดไม่เข้าหมวดหลัก ให้ลงหมวด '${OTHER_DEPARTMENT_CODE}'`,
    "- ห้ามแต่งเติมความต้องการที่ผู้ใช้ไม่ได้กรอก",
    "- ตอบเป็น JSON เท่านั้น ห้ามมี preamble หรือ markdown",
  ].join("\n");
}

/** ตรวจว่า department_code มีจริงใน DB ไม่งั้น fallback เป็น 'other' */
function normalizeAssignments(
  items: AiItem[],
  validCodes: Set<string>,
): AiItem[] {
  return items.map((item) => ({
    ...item,
    assignments: item.assignments.map((a) => ({
      ...a,
      department_code: validCodes.has(a.department_code)
        ? a.department_code
        : OTHER_DEPARTMENT_CODE,
    })),
  }));
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return json({ error: "method not allowed" }, 405);
  }

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    return json({ error: "ANTHROPIC_API_KEY is not configured" }, 500);
  }

  let body: ClassifyRequest;
  try {
    body = (await req.json()) as ClassifyRequest;
  } catch {
    return json({ error: "invalid JSON body" }, 400);
  }

  if (!body.hn || !Array.isArray(body.departments)) {
    return json({ error: "missing hn or departments" }, 400);
  }

  const systemPrompt = buildSystemPrompt(body.departments);
  const validCodes = new Set(body.departments.map((d) => d.code));

  // -------------------------------------------------------------------------
  // TODO (Phase 2): เรียก Claude Opus 4.8 ด้วย systemPrompt + likes/dislikes
  //   1. call Anthropic Messages API (model = MODEL) โดยขอ output เป็น JSON
  //   2. parse ผลลัพธ์เป็น { items: AiItem[] }
  //   3. ถ้า parse ไม่ผ่าน/timeout → คืน status error (ห้ามทำให้บันทึก free text ล้ม)
  //   4. normalizeAssignments(items, validCodes) เพื่อ fallback department_code
  //   5. persist เป็น preference_analysis ใหม่ (is_current=true, ปิดตัวเก่า)
  // -------------------------------------------------------------------------
  void systemPrompt;
  void validCodes;
  void MODEL;

  return json(
    {
      status: "not_implemented",
      message:
        "classify-preferences scaffold พร้อมแล้ว — การเรียกโมเดลจะทำใน Phase 2",
    },
    501,
  );
});

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export { buildSystemPrompt, normalizeAssignments };
