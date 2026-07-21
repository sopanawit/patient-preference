import { Link } from "react-router-dom";

const LINKS = [
  {
    to: "/admin/users",
    title: "เพิ่มผู้ใช้",
    desc: "สร้างบัญชีเจ้าหน้าที่ใหม่ (อีเมล/รหัสผ่าน) และกำหนดสิทธิ์+แผนก",
  },
  {
    to: "/admin/access",
    title: "จัดการสิทธิ์เข้าใช้งาน",
    desc: "อนุมัติ/ปฏิเสธคำขอ และระงับ/คืนสิทธิ์บัญชีผู้ใช้",
  },
  {
    to: "/admin/line",
    title: "ตั้งค่า LINE",
    desc: "กำหนด LIFF ID / Channel สำหรับการเข้าใช้งานผ่าน LINE",
  },
  {
    to: "/admin/departments",
    title: "จัดการหมวดแผนก",
    desc: "เพิ่ม/ปิดใช้งานแผนกปลายทางที่ AI ใช้จัด action",
  },
];

/** หน้าตั้งค่า (Admin) — เมนูรวมลิงก์ไปหน้าย่อย */
export function AdminPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-xl font-semibold text-slate-800">ตั้งค่า (Admin)</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {LINKS.map((link) => (
          <Link key={link.to} to={link.to} className="block min-w-0">
            <div className="h-full rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow">
              <p className="break-words font-medium text-slate-800">
                {link.title}
              </p>
              <p className="mt-1 break-words text-sm text-slate-500">
                {link.desc}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
