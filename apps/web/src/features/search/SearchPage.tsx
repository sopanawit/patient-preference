import { useState } from "react";
import { db, type PatientView } from "@/data";
import { PatientDetail } from "@/features/patient/PatientDetail";

/**
 * หน้าค้นด้วย HN — แสดงรายละเอียดคนไข้ (ผ่าน PatientDetail)
 */
export function SearchPage() {
  const [hn, setHn] = useState("");
  const [result, setResult] = useState<PatientView | null>(null);
  const [searched, setSearched] = useState(false);

  async function search() {
    if (!hn.trim()) return;
    setResult(await db.patients.view(hn.trim()));
    setSearched(true);
  }

  const field =
    "w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500";

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
          className="shrink-0 whitespace-nowrap rounded-md bg-brand-700 px-5 py-2 text-sm font-medium text-white hover:bg-brand-600"
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
        <div className="mt-6">
          <PatientDetail
            view={result}
            onChanged={async () =>
              setResult(await db.patients.view(result.patient.hn))
            }
          />
        </div>
      )}
    </div>
  );
}
