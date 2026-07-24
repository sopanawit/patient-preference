import { useEffect, useMemo, useState } from "react";
import { db, type Department, type PatientView } from "@/data";
import { useAuth } from "@/lib/auth";

/**
 * แสดงรายละเอียดคนไข้ 1 ราย: ชื่อ/ห้อง/ความชอบ (free text) + action รายแผนก
 * ที่ยืนยันแล้ว (confirmed). ระหว่าง pending_review เห็น free text ได้ แต่ยังไม่
 * แสดง action (CLAUDE.md 7.5). ใช้ร่วมกันทั้งหน้าค้นด้วย HN และหน้ารายละเอียด
 * ที่กดมาจากรายชื่อคนแอดมิท.
 */
export function PatientDetail({
  view,
  onChanged,
}: {
  view: PatientView;
  onChanged?: () => void | Promise<void>;
}) {
  const { profile } = useAuth();
  const [depts, setDepts] = useState<Department[]>([]);
  const [discharging, setDischarging] = useState(false);

  useEffect(() => {
    db.departments.listAll().then(setDepts);
  }, []);

  const deptName = useMemo(
    () => (id: string) => depts.find((d) => d.id === id)?.name_th ?? "อื่น ๆ",
    [depts],
  );

  async function discharge() {
    if (!profile) return;
    const ok = window.confirm(
      `จำหน่ายคนไข้ ${view.patient.full_name} (ออกจากห้อง ${view.currentRoom})?`,
    );
    if (!ok) return;
    setDischarging(true);
    await db.patients.discharge(view.patient.hn, profile.id);
    setDischarging(false);
    await onChanged?.();
  }

  const analysis = view.analysis;
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

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h2 className="min-w-0 break-words text-lg font-semibold text-slate-800">
            {view.patient.full_name}
          </h2>
          <div className="flex items-center gap-3">
            <span className="min-w-0 break-words text-sm text-slate-500">
              HN {view.patient.hn} · ห้อง: {view.currentRoom ?? "—"}
            </span>
            {view.currentRoom && (
              <button
                onClick={() => void discharge()}
                disabled={discharging}
                className="shrink-0 whitespace-nowrap rounded-md border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
              >
                {discharging ? "กำลังจำหน่าย…" : "จำหน่าย"}
              </button>
            )}
          </div>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500">สิ่งที่ชอบ</p>
            <p className="mt-1 whitespace-pre-line break-words text-sm text-slate-700">
              {view.patient.likes_text || "—"}
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500">สิ่งที่ไม่ชอบ</p>
            <p className="mt-1 whitespace-pre-line break-words text-sm text-slate-700">
              {view.patient.dislikes_text || "—"}
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
              <p className="font-medium text-brand-700">{g.name}</p>
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
  );
}
