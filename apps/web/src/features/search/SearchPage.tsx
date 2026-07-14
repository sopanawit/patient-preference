import { useEffect, useMemo, useState } from "react";
import { db, type Department, type PatientView } from "@/data";

/**
 * หน้าค้นด้วย HN — แสดงชื่อ/ห้อง/ความชอบ + action รายแผนก (ที่ confirmed แล้ว)
 * ระหว่าง pending_review: เห็น free text ดิบได้ แต่ action ยังไม่แสดง (CLAUDE.md 7.5)
 */
export function SearchPage() {
  const [hn, setHn] = useState("");
  const [result, setResult] = useState<PatientView | null>(null);
  const [searched, setSearched] = useState(false);
  const [depts, setDepts] = useState<Department[]>([]);

  useEffect(() => {
    db.departments.listAll().then(setDepts);
  }, []);

  const deptName = useMemo(
    () => (id: string) => depts.find((d) => d.id === id)?.name_th ?? "อื่น ๆ",
    [depts],
  );

  async function search() {
    if (!hn.trim()) return;
    setResult(await db.patients.view(hn.trim()));
    setSearched(true);
  }

  const analysis = result?.analysis ?? null;
  const showActions = analysis?.status === "confirmed";

  // จัดกลุ่ม assignment ตามแผนก (เฉพาะเมื่อ confirmed)
  const grouped = useMemo(() => {
    if (!analysis || !showActions) return [];
    const map = new Map<string, { original: string; action: string }[]>();
    for (const item of analysis.items)
      for (const asg of item.assignments) {
        const arr = map.get(asg.department_id) ?? [];
        arr.push({ original: item.original_text, action: asg.action_text });
        map.set(asg.department_id, arr);
      }
    return [...map.entries()].map(([deptId, actions]) => ({
      deptId,
      name: deptName(deptId),
      actions,
    }));
  }, [analysis, showActions, deptName]);

  const field =
    "w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500";

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-xl font-semibold text-slate-800">ค้นด้วย HN</h1>

      <div className="mt-4 flex gap-2">
        <input
          value={hn}
          onChange={(e) => setHn(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void search()}
          className={field}
          placeholder="กรอก HN แล้วกด Enter (ลอง HN0001 / HN0002)"
        />
        <button
          onClick={() => void search()}
          className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
        >
          ค้นหา
        </button>
      </div>

      {searched && !result && (
        <p className="mt-6 rounded-md bg-slate-100 px-4 py-3 text-sm text-slate-500">
          ไม่พบคนไข้ HN นี้
        </p>
      )}

      {result && (
        <div className="mt-6 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <h2 className="min-w-0 break-words text-lg font-semibold text-slate-800">
                {result.patient.full_name}
              </h2>
              <span className="min-w-0 break-words text-sm text-slate-500">
                ห้อง: {result.currentRoom ?? "—"}
              </span>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-500">สิ่งที่ชอบ</p>
                <p className="mt-1 whitespace-pre-line break-words text-sm text-slate-700">
                  {result.patient.likes_text || "—"}
                </p>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-500">สิ่งที่ไม่ชอบ</p>
                <p className="mt-1 whitespace-pre-line break-words text-sm text-slate-700">
                  {result.patient.dislikes_text || "—"}
                </p>
              </div>
            </div>
          </div>

          {/* action รายแผนก */}
          {showActions ? (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-700">
                สิ่งที่แต่ละแผนกต้องเตรียม
              </h3>
              {grouped.map((g) => (
                <div
                  key={g.deptId}
                  className="rounded-xl border border-slate-200 bg-white p-4"
                >
                  <p className="font-medium text-sky-700">{g.name}</p>
                  <ul className="mt-2 space-y-1.5">
                    {g.actions.map((a, i) => (
                      <li key={i} className="text-sm text-slate-700">
                        • {a.action}
                        <span className="ml-1 text-xs text-slate-400">
                          (จาก: {a.original})
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-700">
              {analysis
                ? "ผลจัดหมวดรายแผนกกำลังรอ CX ตรวจยืนยัน — ยังไม่แสดง action"
                : "ยังไม่มีผลจัดหมวดสำหรับคนไข้รายนี้"}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
