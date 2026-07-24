import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { db, type PatientView } from "@/data";
import { PatientDetail } from "@/features/patient/PatientDetail";

/**
 * หน้ารายละเอียดคนไข้รายคน (เปิดจากการกดชื่อในรายชื่อคนแอดมิท)
 * แสดงสิ่งที่เคยกรอกไว้ทั้งหมด — ใช้ PatientDetail ร่วมกับหน้าค้นด้วย HN
 */
export function PatientDetailPage() {
  const { hn = "" } = useParams();
  const [view, setView] = useState<PatientView | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setView(await db.patients.view(hn));
    setLoading(false);
  }, [hn]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link
        to="/admissions"
        className="text-sm text-brand-700 hover:text-brand-600"
      >
        ← กลับไปรายชื่อคนแอดมิท
      </Link>

      {loading ? (
        <p className="mt-6 text-sm text-slate-400">กำลังโหลด…</p>
      ) : view ? (
        <div className="mt-4">
          <PatientDetail view={view} onChanged={load} />
        </div>
      ) : (
        <p className="mt-6 rounded-md bg-slate-100 px-4 py-3 text-sm text-slate-500">
          ไม่พบคนไข้ HN {hn}
        </p>
      )}
    </div>
  );
}
