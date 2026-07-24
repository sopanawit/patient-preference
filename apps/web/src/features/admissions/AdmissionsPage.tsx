import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { db, type AdmittedPatient } from "@/data";

/**
 * รายชื่อคนที่กำลังแอดมิท — กดชื่อเพื่อดูรายละเอียดสิ่งที่เคยกรอกไว้
 */
export function AdmissionsPage() {
  const [rows, setRows] = useState<AdmittedPatient[] | null>(null);

  useEffect(() => {
    let active = true;
    db.patients.listActiveAdmissions().then((r) => {
      if (active) setRows(r);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-xl font-semibold text-slate-800">คนแอดมิท</h1>
      <p className="mt-1 text-sm text-slate-500">
        รายชื่อคนไข้ที่กำลังแอดมิท — กดชื่อเพื่อดูสิ่งที่เคยกรอกไว้
      </p>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {rows === null ? (
          <p className="px-5 py-6 text-sm text-slate-400">กำลังโหลด…</p>
        ) : rows.length === 0 ? (
          <p className="px-5 py-6 text-sm text-slate-400">
            ยังไม่มีคนไข้ที่กำลังแอดมิท
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {rows.map((row) => (
              <li key={row.hn}>
                <Link
                  to={`/patient/${encodeURIComponent(row.hn)}`}
                  className="flex flex-wrap items-center gap-3 px-5 py-4 transition-colors hover:bg-brand-50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="break-words font-medium text-slate-800">
                      {row.full_name}
                    </p>
                    <p className="break-words text-sm text-slate-500">
                      HN {row.hn} · ห้อง {row.room} · แอดมิท {row.admit_date}
                    </p>
                  </div>
                  <StatusBadge row={row} />
                  <span aria-hidden="true" className="text-slate-300">
                    ›
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ row }: { row: AdmittedPatient }) {
  const badge = "shrink-0 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs";
  if (!row.hasPreferences)
    return (
      <span className={`${badge} bg-slate-100 text-slate-500`}>
        ยังไม่กรอกความชอบ
      </span>
    );
  if (row.analysisStatus === "confirmed")
    return (
      <span className={`${badge} bg-emerald-100 text-emerald-700`}>
        ยืนยันแล้ว
      </span>
    );
  return (
    <span className={`${badge} bg-amber-100 text-amber-700`}>รอ CX ตรวจ</span>
  );
}
