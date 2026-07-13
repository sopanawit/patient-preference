import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import type { StaffRole } from "@/types/database";

/**
 * Guard ระดับ role — ใช้ครอบภายใน <RequireAuth> อีกชั้น
 * ถ้า role ของผู้ใช้ไม่อยู่ใน allow → แสดงหน้า 403
 */
export function RequireRole({
  allow,
  children,
}: {
  allow: StaffRole[];
  children: ReactNode;
}) {
  const { profile } = useAuth();

  if (!profile || !allow.includes(profile.role)) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-lg font-semibold text-slate-800">
          ไม่มีสิทธิ์เข้าถึง
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          หน้านี้จำกัดเฉพาะบางบทบาทเท่านั้น
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
