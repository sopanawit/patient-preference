import { useState } from "react";
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
  const [menuOpen, setMenuOpen] = useState(false);
  const items = NAV.filter(
    (item) => !item.roles || (profile && item.roles.includes(profile.role)),
  );

  // ปิดเมนูมือถืออัตโนมัติเมื่อเปลี่ยนหน้า
  const closeMenu = () => setMenuOpen(false);

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `block rounded-md px-3 py-2 transition-colors md:py-1.5 ${
      isActive
        ? "bg-sky-100 text-sky-700"
        : "text-slate-600 hover:bg-slate-100"
    }`;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4">
          <div className="flex h-14 items-center gap-4">
            <span className="flex-1 truncate font-semibold text-slate-800">
              ระบบความต้องการพิเศษของคนไข้
            </span>

            {/* เมนูแนวนอน — เฉพาะจอ md ขึ้นไป */}
            <nav className="hidden flex-1 gap-1 text-sm md:flex">
              {items.map((item) => (
                <NavLink key={item.to} to={item.to} className={navLinkClass}>
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <button
              onClick={() => void signOut()}
              className="hidden text-sm text-slate-500 hover:text-slate-800 md:block"
            >
              ออกจากระบบ
            </button>

            {/* ปุ่ม hamburger — เฉพาะจอเล็ก */}
            <button
              type="button"
              aria-label="เมนู"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
              className="-mr-2 inline-flex h-10 w-10 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 md:hidden"
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                {menuOpen ? (
                  <path d="M6 6l12 12M18 6L6 18" />
                ) : (
                  <path d="M4 7h16M4 12h16M4 17h16" />
                )}
              </svg>
            </button>
          </div>

          {/* เมนูแบบ dropdown สำหรับจอเล็ก */}
          {menuOpen && (
            <nav className="flex flex-col gap-1 border-t border-slate-100 py-2 text-sm md:hidden">
              {items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={closeMenu}
                  className={navLinkClass}
                >
                  {item.label}
                </NavLink>
              ))}
              <button
                onClick={() => {
                  closeMenu();
                  void signOut();
                }}
                className="mt-1 rounded-md px-3 py-2 text-left text-slate-500 hover:bg-slate-100"
              >
                ออกจากระบบ
              </button>
            </nav>
          )}
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
