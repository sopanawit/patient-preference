import { BrowserRouter, NavLink, Navigate, Route, Routes } from "react-router-dom";
import { EntryPage } from "@/features/entry/EntryPage";
import { SearchPage } from "@/features/search/SearchPage";
import { ReviewPage } from "@/features/review/ReviewPage";
import { AdminPage } from "@/features/admin/AdminPage";

const NAV = [
  { to: "/entry", label: "กรอกข้อมูล" },
  { to: "/search", label: "ค้นด้วย HN" },
  { to: "/review", label: "คิวรอตรวจ" },
  { to: "/admin", label: "ตั้งค่า" },
];

export function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
            <span className="font-semibold text-slate-800">
              ระบบความต้องการพิเศษของคนไข้
            </span>
            <nav className="flex gap-1 text-sm">
              {NAV.map((item) => (
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
          </div>
        </header>

        <main>
          <Routes>
            <Route path="/" element={<Navigate to="/search" replace />} />
            <Route path="/entry" element={<EntryPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/review" element={<ReviewPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="*" element={<Navigate to="/search" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
