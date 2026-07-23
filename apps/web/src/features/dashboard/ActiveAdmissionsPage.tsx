import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { db, type ActiveAdmission } from "@/data";

/**
 * หน้ารายชื่อคนไข้ที่กำลังแอดมิท — เปิดจากการ์ด "กำลังแอดมิท" ในหน้าภาพรวม
 * เรียงตามห้องพักจากน้อยไปมาก (CLAUDE.md 11 / dashboard)
 */
export function ActiveAdmissionsPage() {
  const [rows, setRows] = useState<ActiveAdmission[] | null>(null);

  useEffect(() => {
    let active = true;
    db.dashboard.listActiveAdmissions().then((d) => {
      if (active) setRows(d);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Link
        to="/dashboard"
        className="text-sm text-brand-700 hover:underline"
      >
        ← กลับสู่ภาพรวม
      </Link>
      <div className="mt-2 flex items-baseline justify-between gap-4">
        <h1 className="text-xl font-semibold text-slate-800">
          คนไข้ที่กำลังแอดมิท
        </h1>
        {rows && (
          <span className="text-sm text-slate-500">{rows.length} คน</span>
        )}
      </div>
      <p className="mt-1 text-sm text-slate-500">เรียงตามห้องพักจากน้อยไปมาก</p>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {rows === null ? (
          <p className="p-6 text-sm text-slate-500">กำลังโหลด…</p>
        ) : rows.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">
            ยังไม่มีคนไข้ที่กำลังแอดมิท
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">ห้องพัก</th>
                <th className="px-4 py-3 font-medium">HN</th>
                <th className="px-4 py-3 font-medium">ชื่อ-สกุล</th>
                <th className="px-4 py-3 font-medium">วันที่แอดมิท</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {r.room}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{r.hn}</td>
                  <td className="px-4 py-3 text-slate-800">{r.full_name}</td>
                  <td className="px-4 py-3 text-slate-600">{r.admit_date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
