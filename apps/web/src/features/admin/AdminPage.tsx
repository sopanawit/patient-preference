import { useState } from "react";
import { Link } from "react-router-dom";
import { db } from "@/data";

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

/** หน้าตั้งค่า (Admin) — เมนูรวมลิงก์ไปหน้าย่อย + export ข้อมูล (admin เท่านั้น) */
export function AdminPage() {
  const [exporting, setExporting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function handleExport() {
    setMsg(null);
    setExporting(true);
    try {
      const rows = await db.patients.exportAll();
      if (rows.length === 0) {
        setMsg("ยังไม่มีข้อมูลคนไข้ให้ export");
        return;
      }
      // โหลด lib สร้าง Excel แบบ on-demand (แยก chunk — ไม่ถ่วง bundle หลัก)
      const { exportPatientsToExcel } = await import("@/lib/exportExcel");
      exportPatientsToExcel(rows);
      setMsg(`ดาวน์โหลดแล้ว (${rows.length} ราย)`);
    } catch {
      setMsg("export ไม่สำเร็จ — ลองใหม่อีกครั้ง");
    } finally {
      setExporting(false);
    }
  }

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

      {/* Export ข้อมูลคนไข้ทั้งหมด (Excel) — admin เท่านั้น */}
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="font-medium text-slate-800">Export ข้อมูลคนไข้ (Excel)</p>
        <p className="mt-1 text-sm text-slate-500">
          ดาวน์โหลดข้อมูลคนไข้ทั้งหมด (HN, ชื่อ, ห้อง, ความชอบ/ไม่ชอบ, ผู้บันทึก)
          เป็นไฟล์ .xlsx
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            onClick={() => void handleExport()}
            disabled={exporting}
            className="shrink-0 whitespace-nowrap rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
          >
            {exporting ? "กำลังเตรียมไฟล์…" : "ดาวน์โหลด Excel"}
          </button>
          {msg && <span className="text-sm text-slate-600">{msg}</span>}
        </div>
      </div>
    </div>
  );
}
