import { useEffect, useState } from "react";
import { db } from "@/data";
import { useAuth } from "@/lib/auth";
import { APP_SETTING_KEYS } from "@patient-preference/shared";

const FIELDS: { key: (typeof APP_SETTING_KEYS)[number]; label: string; secret?: boolean }[] = [
  { key: "line_liff_id", label: "LIFF ID" },
  { key: "line_channel_id", label: "Channel ID" },
  { key: "line_channel_secret", label: "Channel Secret", secret: true },
];

/**
 * ตั้งค่า LINE (admin) — เก็บลง app_settings เพื่อใช้เชื่อม LINE login ภายหลัง
 * ตัว flow login จริงจะ implement ในเฟสถัดไป
 */
export function LineSettingsPage() {
  const { profile } = useAuth();
  const [values, setValues] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");

  useEffect(() => {
    let active = true;
    db.settings.getLineConfig().then((v) => {
      if (active) setValues(v);
    });
    return () => {
      active = false;
    };
  }, []);

  async function save() {
    if (!profile) return;
    setStatus("saving");
    await db.settings.saveLineConfig(values, profile.id);
    setStatus("saved");
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-xl font-semibold text-slate-800">ตั้งค่า LINE</h1>
      <p className="mt-1 text-sm text-slate-500">
        ค่าเหล่านี้ใช้สำหรับเชื่อมต่อการเข้าใช้งานผ่าน LINE (จะเปิดใช้งานในเฟสถัดไป)
      </p>

      <div className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-white p-6">
        {FIELDS.map((f) => (
          <label key={f.key} className="block text-sm font-medium text-slate-700">
            {f.label}
            <input
              type={f.secret ? "password" : "text"}
              value={values[f.key] ?? ""}
              onChange={(e) => {
                setValues((v) => ({ ...v, [f.key]: e.target.value }));
                setStatus("idle");
              }}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              autoComplete="off"
            />
          </label>
        ))}

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={() => void save()}
            disabled={status === "saving"}
            className="rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
          >
            {status === "saving" ? "กำลังบันทึก…" : "บันทึก"}
          </button>
          {status === "saved" && (
            <span className="text-sm text-emerald-600">บันทึกแล้ว</span>
          )}
        </div>

        <p className="pt-2 text-xs text-amber-600">
          ⚠️ Channel Secret เป็นความลับ — production ควรพิจารณาเก็บไว้ที่ Edge Function
          env แทนการเก็บในฐานข้อมูล
        </p>
      </div>
    </div>
  );
}
