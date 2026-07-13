import {
  BrowserRouter,
  NavLink,
  Navigate,
  Outlet,
  Route,
  Routes,
} from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/auth";
import { RequireAuth } from "@/components/RequireAuth";
import { RequireRole } from "@/components/RequireRole";
import { LoginPage } from "@/features/auth/LoginPage";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { EntryPage } from "@/features/entry/EntryPage";
import { SearchPage } from "@/features/search/SearchPage";
import { ReviewPage } from "@/features/review/ReviewPage";
import { AdminPage } from "@/features/admin/AdminPage";
import { AccessRequestsPage } from "@/features/admin/access/AccessRequestsPage";
import { DepartmentsPage } from "@/features/admin/departments/DepartmentsPage";
import { LineSettingsPage } from "@/features/admin/LineSettingsPage";
import type { StaffRole } from "@/types/database";

const NAV: { to: string; label: string; roles?: StaffRole[] }[] = [
  { to: "/dashboard", label: "ภาพรวม" },
  { to: "/entry", label: "กรอกข้อมูล" },
  { to: "/search", label: "ค้นด้วย HN" },
  { to: "/review", label: "คิวรอตรวจ", roles: ["cx_manager", "admin"] },
  { to: "/admin", label: "ตั้งค่า", roles: ["admin"] },
];

function Layout() {
  const { profile, signOut } = useAuth();
  const items = NAV.filter(
    (item) => !item.roles || (profile && item.roles.includes(profile.role)),
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
          <span className="font-semibold text-slate-800">
            ระบบความต้องการพิเศษของคนไข้
          </span>
          <nav className="flex flex-1 gap-1 text-sm">
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `rounded-md px-3 py-1.5 transition-colors ${
                    isActive
                      ? "bg-sky-100 text-sky-700"
                      : "text-slate-600 hover:bg-slate-100"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <button
            onClick={() => void signOut()}
            className="text-sm text-slate-500 hover:text-slate-800"
          >
            ออกจากระบบ
          </button>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}

const ADMIN_ONLY: StaffRole[] = ["admin"];
const REVIEWERS: StaffRole[] = ["cx_manager", "admin"];

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            element={
              <RequireAuth>
                <Layout />
              </RequireAuth>
            }
          >
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/entry" element={<EntryPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route
              path="/review"
              element={
                <RequireRole allow={REVIEWERS}>
                  <ReviewPage />
                </RequireRole>
              }
            />
            <Route
              path="/admin"
              element={
                <RequireRole allow={ADMIN_ONLY}>
                  <AdminPage />
                </RequireRole>
              }
            />
            <Route
              path="/admin/access"
              element={
                <RequireRole allow={ADMIN_ONLY}>
                  <AccessRequestsPage />
                </RequireRole>
              }
            />
            <Route
              path="/admin/line"
              element={
                <RequireRole allow={ADMIN_ONLY}>
                  <LineSettingsPage />
                </RequireRole>
              }
            />
            <Route
              path="/admin/departments"
              element={
                <RequireRole allow={ADMIN_ONLY}>
                  <DepartmentsPage />
                </RequireRole>
              }
            />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
