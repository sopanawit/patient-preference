import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";

function CenteredCard({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        {children}
      </div>
    </div>
  );
}

/**
 * Guard: ต้องล็อกอิน + มีบัญชี staff ที่ active เท่านั้น
 *   - ยังไม่ล็อกอิน → /login
 *   - ล็อกอินแต่ไม่มีโปรไฟล์ staff → รออนุมัติ
 *   - โปรไฟล์ถูกระงับ (is_active=false) → ถูกระงับสิทธิ์
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, profile, loading, signOut } = useAuth();

  if (loading) {
    return (
      <CenteredCard>
        <p className="text-sm text-slate-500">กำลังโหลด…</p>
      </CenteredCard>
    );
  }

  if (!session) return <Navigate to="/login" replace />;

  if (!profile) {
    return (
      <CenteredCard>
        <h1 className="text-lg font-semibold text-slate-800">รอการอนุมัติ</h1>
        <p className="mt-2 text-sm text-slate-600">
          บัญชีของคุณยังไม่ได้รับสิทธิ์เข้าใช้งาน กรุณารอผู้ดูแลระบบอนุมัติ
        </p>
        <button
          onClick={() => void signOut()}
          className="mt-6 text-sm text-sky-600 hover:underline"
        >
          ออกจากระบบ
        </button>
      </CenteredCard>
    );
  }

  if (!profile.is_active) {
    return (
      <CenteredCard>
        <h1 className="text-lg font-semibold text-slate-800">
          สิทธิ์ถูกระงับ
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          สิทธิ์การเข้าใช้งานของคุณถูกระงับ กรุณาติดต่อผู้ดูแลระบบ
        </p>
        <button
          onClick={() => void signOut()}
          className="mt-6 text-sm text-sky-600 hover:underline"
        >
          ออกจากระบบ
        </button>
      </CenteredCard>
    );
  }

  return <>{children}</>;
}
