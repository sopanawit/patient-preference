import { useCallback, useEffect, useState } from "react";
import { db, type Analysis, type Department } from "@/data";
import { useAuth } from "@/lib/auth";

/**
 * คิวรอตรวจ (CX/Admin) — ดู original_text คู่กับ action ที่ AI เสนอ
 * แก้ action_text / ย้ายแผนก / ลบ แล้วกดยืนยัน → confirmed (CLAUDE.md 7.6)
 */
export function ReviewPage() {
  const { profile } = useAuth();
  const [items, setItems] = useState<Analysis[]>([]);
  const [depts, setDepts] = useState<Department[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [pending, deptList] = await Promise.all([
      db.analysis.listPending(),
      db.departments.listActive(),
    ]);
    setItems(pending);
    setDepts(deptList);
    const entries = await Promise.all(
      pending.map(async (a) => {
        const p = await db.patients.getByHn(a.hn);
        return [a.hn, p?.full_name ?? a.hn] as const;
      }),
    );
    setNames(Object.fromEntries(entries));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function editAction(id: string, action_text: string) {
    if (!profile) return;
    await db.analysis.updateAssignment(id, { action_text }, profile.id);
  }
  async function moveDept(id: string, department_id: string) {
    if (!profile) return;
    await db.analysis.updateAssignment(id, { department_id }, profile.id);
    await load();
  }
  async function remove(id: string) {
    if (!profile) return;
    await db.analysis.deleteAssignment(id, profile.id);
    await load();
  }
  async function confirm(analysisId: string) {
    if (!profile) return;
    setBusy(analysisId);
    await db.analysis.confirm(analysisId, profile.id);
    setBusy(null);
    await load();
  }

  const field =
    "w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500";

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-xl font-semibold text-slate-800">คิวรอตรวจ (CX)</h1>

      {items.length === 0 ? (
        <p className="mt-6 rounded-md bg-slate-100 px-4 py-3 text-sm text-slate-500">
          ไม่มีรายการรอตรวจ
        </p>
      ) : (
        <div className="mt-6 space-y-6">
          {items.map((a) => (
            <div
              key={a.id}
              className="rounded-xl border border-slate-200 bg-white p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="min-w-0 break-words font-semibold text-slate-800">
                  {names[a.hn]}{" "}
                  <span className="text-sm font-normal text-slate-400">
                    ({a.hn})
                  </span>
                </h2>
                <button
                  disabled={busy === a.id}
                  onClick={() => void confirm(a.id)}
                  className="rounded-md bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  ยืนยัน
                </button>
              </div>

              <div className="mt-4 space-y-4">
                {a.items.map((item) => (
                  <div key={item.id} className="rounded-lg bg-slate-50 p-3">
                    <p className="text-sm">
                      <span
                        className={`mr-2 rounded px-1.5 py-0.5 text-xs ${
                          item.source === "like"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        {item.source === "like" ? "ชอบ" : "ไม่ชอบ"}
                      </span>
                      {item.original_text}
                    </p>

                    <div className="mt-2 space-y-2">
                      {item.assignments.map((asg) => (
                        <div
                          key={asg.id}
                          className="flex flex-wrap items-center gap-2"
                        >
                          <select
                            defaultValue={asg.department_id}
                            onChange={(e) => void moveDept(asg.id, e.target.value)}
                            className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm sm:w-auto"
                          >
                            {depts.map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.name_th}
                              </option>
                            ))}
                          </select>
                          <input
                            defaultValue={asg.action_text}
                            onBlur={(e) => void editAction(asg.id, e.target.value)}
                            className={`${field} w-full sm:flex-1`}
                          />
                          <button
                            onClick={() => void remove(asg.id)}
                            className="rounded-md border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
                          >
                            ลบ
                          </button>
                        </div>
                      ))}
                      {item.assignments.length === 0 && (
                        <p className="text-xs text-slate-400">
                          (ไม่มี action — จะไม่แสดงในผลลัพธ์)
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
