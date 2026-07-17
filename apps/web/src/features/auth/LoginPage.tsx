import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { db, DATA_BACKEND } from "@/data";
import logoUrl from "@/assets/koon-logo.png";

/**
 * หน้า login สำหรับ admin (email/password ผ่าน Supabase Auth)
 * staff ทั่วไปเข้าผ่าน LINE LIFF (ทำภายหลัง) ไม่ใช้หน้านี้
 */
export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // อ่านค่าจากฟอร์มจริง (กันปัญหา browser autofill ที่ไม่ trigger onChange
    // ทำให้ state ว่างตอนกด Enter) — fallback เป็น state ถ้าไม่มีค่า
    const fd = new FormData(e.currentTarget);
    const emailVal = (String(fd.get("email") ?? "") || email).trim();
    const passwordVal = String(fd.get("password") ?? "") || password;
    setError(null);
    setSubmitting(true);
    const { error: signInError } = await db.auth.signIn(emailVal, passwordVal);
    setSubmitting(false);
    if (signInError) {
      setError("เข้าสู่ระบบไม่สำเร็จ — ตรวจสอบอีเมลและรหัสผ่าน");
      return;
    }
    navigate("/dashboard", { replace: true });
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-brand-50 px-4 py-10">
      <div className="mb-6 flex flex-col items-center text-center">
        <img src={logoUrl} alt="KOON" className="h-24 w-auto object-contain" />
        <p className="mt-3 text-sm text-brand-600">
          ระบบความต้องการพิเศษของคนไข้
        </p>
      </div>
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-xl border border-brand-200 bg-white p-8 shadow-sm"
      >
        <h1 className="text-lg font-semibold text-slate-800">เข้าสู่ระบบ</h1>
        <p className="mt-1 text-sm text-slate-500">
          สำหรับผู้ดูแลระบบ (admin)
        </p>

        {DATA_BACKEND === "mock" && (
          <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
            โหมดเดโม (mock): ล็อกอินด้วยอีเมลอะไรก็ได้ →
            เข้าเป็น admin ; หรือใช้ <code>cx@hospital.local</code> /
            <code> nurse@hospital.local</code> เพื่อดูมุมมองบทบาทอื่น
          </p>
        )}

        <label className="mt-6 block text-sm font-medium text-slate-700">
          อีเมล
          <input
            type="email"
            name="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            autoComplete="email"
          />
        </label>

        <label className="mt-4 block text-sm font-medium text-slate-700">
          รหัสผ่าน
          <input
            type="password"
            name="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            autoComplete="current-password"
          />
        </label>

        {error && (
          <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="mt-6 w-full rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600 disabled:opacity-60"
        >
          {submitting ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
        </button>
      </form>
    </div>
  );
}
