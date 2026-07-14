import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { db, type OverviewCounts } from "@/data";
import { useAuth } from "@/lib/auth";

const CARDS: {
  key: keyof OverviewCounts;
  label: string;
  to?: string;
  accent: string;
  adminOnly?: boolean;
}[] = [
  { key: "patients", label: "คนไข้ทั้งหมด", accent: "text-slate-800" },
  { key: "activeAdmissions", label: "กำลังแอดมิท", accent: "text-emerald-600" },
  {
    key: "pendingReviews",
    label: "รอ CX ตรวจ",
    to: "/review",
    accent: "text-amber-600",
  },
  {
    key: "pendingRequests",
    label: "คำขอเข้าใช้งานรออนุมัติ",
    to: "/admin/access",
    accent: "text-sky-600",
    adminOnly: true,
  },
];

export function DashboardPage() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";
  const [data, setData] = useState<OverviewCounts | null>(null);

  useEffect(() => {
    let active = true;
    db.dashboard.overview(isAdmin).then((d) => {
      if (active) setData(d);
    });
    return () => {
      active = false;
    };
  }, [isAdmin]);

  const cards = CARDS.filter((c) => !c.adminOnly || isAdmin);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-xl font-semibold text-slate-800">ภาพรวมระบบ</h1>
      <p className="mt-1 text-sm text-slate-500">สวัสดี {profile?.full_name}</p>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((card) => {
          const value = data ? data[card.key] : null;
          const body = (
            <div className="h-full rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow">
              <p className="break-words text-sm text-slate-500">{card.label}</p>
              <p className={`mt-2 text-3xl font-semibold ${card.accent}`}>
                {value === null ? "—" : value}
              </p>
            </div>
          );
          return card.to ? (
            <Link key={card.key} to={card.to} className="block min-w-0">
              {body}
            </Link>
          ) : (
            <div key={card.key} className="min-w-0">
              {body}
            </div>
          );
        })}
      </div>
    </div>
  );
}
