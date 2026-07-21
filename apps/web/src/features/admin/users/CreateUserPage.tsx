import { useEffect, useState, type FormEvent } from "react";
import { db, type Department } from "@/data";
import { useAuth } from "@/lib/auth";
import { STAFF_ROLES, ROLE_LABELS } from "@patient-preference/shared";
import type { StaffRole } from "@/types/database";

/**
 * หน้าเพิ่มผู้ใช้ (Admin) — สร้าง auth user + staff ผ่าน Edge Function admin-create-user
 * ไม่ต้องแตะ SQL/Supabase Studio
 */
export function CreateUserPage() {
  const { profile } = useAuth();
  const [depts, setDepts] = useState<Department[]>([]);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    role: "cs" as StaffRole,
    department_id: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ email: string; password: string } | null>(
    null,
  );

  useEffect(() => {
    db.departments.listActive().then(setDepts);
  }, []);

  const set = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  function generatePassword() {
    const rand = Math.random().toString(36).slice(2, 10);
    set("password", `Koon-${rand}`);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setError(null);
    setSubmitting(true);
    const { error: err } = await db.access.createUser(
      {
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
        department_id: form.department_id || null,
      },
      profile.id,
    );
    setSubmitting(false);
    if (err) {
      setError(err);
      return;
    }
    setDone({ email: form.email.trim(), password: form.password });
    setForm({
      full_name: "",
      email: "",
      password: "",
      role: "cs",
      department_id: "",
    });
  }

  const field =
    "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500";

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <h1 className="text-xl font-semibold text-slate-800">เพิ่มผู้ใช้</h1>
      <p className="mt-1 text-sm text-slate-500">
        สร้างบัญชีเจ้าหน้าที่ใหม่ (ล็อกอินด้วยอีเมล/รหัสผ่าน) และกำหนดสิทธิ์
      </p>

      {done && (
        <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm">
          <p className="font-medium text-emerald-800">สร้างบัญชีสำเร็จ ✅</p>
          <p className="mt-2 text-slate-700">
            แจ้งข้อมูลนี้ให้ผู้ใช้ (แนะนำให้เปลี่ยนรหัสผ่านภายหลัง):
          </p>
          <div className="mt-2 rounded-md bg-white px-3 py-2 font-mono text-xs text-slate-800">
            <div>อีเมล: {done.email}</div>
            <div>รหัสผ่าน: {done.password}</div>
          </div>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-white p-6"
      >
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
          อีเมล (ใช้ล็อกอิน)
          <input
            type="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            className={field}
            required
            autoComplete="off"
          />
        </label>

        <label className="block text-sm font-medium text-slate-700">
          รหัสผ่าน (อย่างน้อย 8 ตัว)
          <div className="mt-1 flex gap-2">
            <input
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              minLength={8}
              required
            />
            <button
              type="button"
              onClick={generatePassword}
              className="shrink-0 whitespace-nowrap rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-brand-50"
            >
              สุ่มรหัส
            </button>
          </div>
        </label>

        <label className="block text-sm font-medium text-slate-700">
          สิทธิ์ (role)
          <select
            value={form.role}
            onChange={(e) => set("role", e.target.value)}
            className={field}
          >
            {STAFF_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-medium text-slate-700">
          แผนกต้นสังกัด
          <select
            value={form.department_id}
            onChange={(e) => set("department_id", e.target.value)}
            className={field}
          >
            <option value="">— ไม่ระบุ —</option>
            {depts.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name_th}
              </option>
            ))}
          </select>
        </label>

        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
        >
          {submitting ? "กำลังสร้าง…" : "สร้างบัญชี"}
        </button>
      </form>
    </div>
  );
}
