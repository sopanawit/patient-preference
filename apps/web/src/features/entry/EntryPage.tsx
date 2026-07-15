import { useState, type FormEvent } from "react";
import { db } from "@/data";
import { useAuth } from "@/lib/auth";
import { NON_MEDICAL_HINT } from "@patient-preference/shared";

const empty = {
  hn: "",
  full_name: "",
  room: "",
  likes_text: "",
  dislikes_text: "",
};

/**
 * หน้ากรอกข้อมูล — HN, ชื่อ, ห้องพัก, likes/dislikes (+ hint non-medical)
 * HN เดิม → ดึงความชอบ/ห้องพักปัจจุบันขึ้นมาให้ (ดู CLAUDE.md 7.1/7.2)
 */
export function EntryPage() {
  const { profile } = useAuth();
  const [form, setForm] = useState(empty);
  const [loadedHn, setLoadedHn] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [lookupMsg, setLookupMsg] = useState<string | null>(null);

  const set = (k: keyof typeof empty, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setStatus("idle");
  };

  async function lookup() {
    const hn = form.hn.trim();
    if (!hn) return;
    const [patient, adm] = await Promise.all([
      db.patients.getByHn(hn),
      db.patients.currentAdmission(hn),
    ]);
    if (patient) {
      setForm({
        hn,
        full_name: patient.full_name,
        room: adm?.room ?? "",
        likes_text: patient.likes_text,
        dislikes_text: patient.dislikes_text,
      });
      setLoadedHn(hn);
      setLookupMsg("พบข้อมูลเดิม — ดึงความชอบขึ้นมาให้แล้ว");
    } else {
      setLoadedHn(null);
      setLookupMsg("ยังไม่มี HN นี้ — กรอกเพื่อสร้างใหม่");
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setStatus("saving");
    await db.patients.save({
      hn: form.hn.trim(),
      full_name: form.full_name.trim(),
      likes_text: form.likes_text,
      dislikes_text: form.dislikes_text,
      room: form.room.trim(),
      actorId: profile.id,
    });
    setStatus("saved");
    setLoadedHn(form.hn.trim());
    setLookupMsg(null);
  }

  const field =
    "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500";

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-xl font-semibold text-slate-800">กรอกข้อมูลคนไข้</h1>

      <form
        onSubmit={handleSubmit}
        className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-white p-6"
      >
        <div className="flex items-end gap-2">
          <label className="min-w-0 flex-1 text-sm font-medium text-slate-700">
            HN
            <input
              value={form.hn}
              onChange={(e) => set("hn", e.target.value)}
              className={field}
              placeholder="เช่น HN0001"
            />
          </label>
          <button
            type="button"
            onClick={() => void lookup()}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            ค้นข้อมูลเดิม
          </button>
        </div>
        {lookupMsg && <p className="text-xs text-sky-600">{lookupMsg}</p>}

        <label className="block text-sm font-medium text-slate-700">
          ชื่อ-สกุล
          <input
            value={form.full_name}
            onChange={(e) => set("full_name", e.target.value)}
            className={field}
            required
          />
        </label>

        <label className="block text-sm font-medium text-slate-700">
          ห้องพัก
          <input
            value={form.room}
            onChange={(e) => set("room", e.target.value)}
            className={field}
            placeholder="เช่น 301/A"
          />
        </label>

        <div className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
          {NON_MEDICAL_HINT}
        </div>

        <label className="block text-sm font-medium text-slate-700">
          สิ่งที่ชอบ (แต่ละบรรทัด = 1 เรื่อง)
          <textarea
            value={form.likes_text}
            onChange={(e) => set("likes_text", e.target.value)}
            className={`${field} min-h-24`}
          />
        </label>

        <label className="block text-sm font-medium text-slate-700">
          สิ่งที่ไม่ชอบ (แต่ละบรรทัด = 1 เรื่อง)
          <textarea
            value={form.dislikes_text}
            onChange={(e) => set("dislikes_text", e.target.value)}
            className={`${field} min-h-24`}
          />
        </label>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={status === "saving"}
            className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-60"
          >
            {status === "saving" ? "กำลังบันทึก…" : "บันทึก"}
          </button>
          {status === "saved" && (
            <span className="text-sm text-emerald-600">
              บันทึกแล้ว — ระบบส่งจัดหมวดใหม่ (รอ CX ตรวจ)
            </span>
          )}
          {loadedHn && status === "idle" && (
            <span className="text-xs text-slate-400">HN ปัจจุบัน: {loadedHn}</span>
          )}
        </div>
      </form>
    </div>
  );
}
