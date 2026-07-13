import { useCallback, useEffect, useState, type FormEvent } from "react";
import { db, type Department } from "@/data";
import { useAuth } from "@/lib/auth";

/**
 * จัดการหมวดแผนกปลายทาง (admin) — เพิ่ม / เปิด-ปิดใช้งาน
 * รายชื่อนี้เป็น dynamic ที่ AI ใช้เป็นหมวดปลายทาง (CLAUDE.md 7.3)
 */
export function DepartmentsPage() {
  const { profile } = useAuth();
  const [rows, setRows] = useState<Department[]>([]);
  const [code, setCode] = useState("");
  const [nameTh, setNameTh] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setRows(await db.departments.listAll());
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function add(e: FormEvent) {
    e.preventDefault();
    if (!profile || !code.trim() || !nameTh.trim()) return;
    setBusy(true);
    await db.departments.create(
      { code: code.trim(), name_th: nameTh.trim() },
      profile.id,
    );
    setCode("");
    setNameTh("");
    setBusy(false);
    await load();
  }

  async function toggle(row: Department) {
    if (!profile) return;
    await db.departments.update(
      row.id,
      { is_active: !row.is_active },
      profile.id,
    );
    await load();
  }

  const field =
    "rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500";

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-xl font-semibold text-slate-800">จัดการหมวดแผนก</h1>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <ul className="divide-y divide-slate-100">
          {rows.map((row) => (
            <li key={row.id} className="flex items-center gap-3 px-5 py-3">
              <div className="flex-1">
                <p className="font-medium text-slate-800">{row.name_th}</p>
                <p className="text-xs text-slate-400">{row.code}</p>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  row.is_active
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {row.is_active ? "ใช้งาน" : "ปิด"}
              </span>
              <button
                onClick={() => void toggle(row)}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
              >
                {row.is_active ? "ปิดใช้งาน" : "เปิดใช้งาน"}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <form
        onSubmit={add}
        className="mt-6 flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white p-5"
      >
        <label className="text-sm font-medium text-slate-700">
          code
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className={`${field} mt-1 block`}
            placeholder="เช่น pharmacy"
          />
        </label>
        <label className="flex-1 text-sm font-medium text-slate-700">
          ชื่อแผนก (ไทย)
          <input
            value={nameTh}
            onChange={(e) => setNameTh(e.target.value)}
            className={`${field} mt-1 block w-full`}
            placeholder="เช่น แผนกเภสัชกรรม"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-60"
        >
          เพิ่มแผนก
        </button>
      </form>
    </div>
  );
}
