import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

interface Overview {
  patients: number;
  activeAdmissions: number;
  pendingReviews: number;
  pendingRequests: number;
}

/** นับจำนวนแถวแบบ head-only (ไม่ดึงข้อมูลจริง) */
async function countRows(
  table: "patients" | "admissions" | "preference_analysis" | "access_requests",
  filter?: (q: ReturnType<typeof buildCount>) => ReturnType<typeof buildCount>,
): Promise<number> {
  let query = buildCount(table);
  if (filter) query = filter(query);
  const { count } = await query;
  return count ?? 0;
}

function buildCount(table: string) {
  return supabase.from(table).select("*", { count: "exact", head: true });
}

const CARDS: {
  key: keyof Overview;
  label: string;
  to?: string;
  accent: string;
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
  },
];

export function DashboardPage() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";
  const [data, setData] = useState<Overview | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      const [patients, activeAdmissions, pendingReviews, pendingRequests] =
        await Promise.all([
          countRows("patients"),
          countRows("admissions", (q) => q.eq("status", "active")),
          countRows("preference_analysis", (q) =>
            q.eq("status", "pending_review"),
          ),
          isAdmin
            ? countRows("access_requests", (q) => q.eq("status", "pending"))
            : Promise.resolve(0),
        ]);
      if (active)
        setData({ patients, activeAdmissions, pendingReviews, pendingRequests });
    }
    void load();
    return () => {
      active = false;
    };
  }, [isAdmin]);

  const visibleCards = CARDS.filter(
    (c) => c.key !== "pendingRequests" || isAdmin,
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-xl font-semibold text-slate-800">ภาพรวมระบบ</h1>
      <p className="mt-1 text-sm text-slate-500">
        สวัสดี {profile?.full_name}
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {visibleCards.map((card) => {
          const value = data ? data[card.key] : null;
          const body = (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow">
              <p className="text-sm text-slate-500">{card.label}</p>
              <p className={`mt-2 text-3xl font-semibold ${card.accent}`}>
                {value === null ? "—" : value}
              </p>
            </div>
          );
          return card.to ? (
            <Link key={card.key} to={card.to}>
              {body}
            </Link>
          ) : (
            <div key={card.key}>{body}</div>
          );
        })}
      </div>
    </div>
  );
}
