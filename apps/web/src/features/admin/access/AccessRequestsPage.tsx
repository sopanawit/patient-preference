import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { ASSIGNABLE_ROLES, ROLE_LABELS } from "@patient-preference/shared";
import type { StaffRole } from "@/types/database";

interface RequestRow {
  id: string;
  full_name: string;
  note: string | null;
  created_at: string;
  department_id: string | null;
}
interface StaffRow {
  id: string;
  full_name: string;
  role: StaffRole;
  is_active: boolean;
  department_id: string | null;
}

export function AccessRequestsPage() {
  const { profile } = useAuth();
  const [depts, setDepts] = useState<Record<string, string>>({});
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [chosenRole, setChosenRole] = useState<Record<string, StaffRole>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [deptRes, reqRes, staffRes] = await Promise.all([
      supabase.from("departments").select("id, name_th"),
      supabase
        .from("access_requests")
        .select("id, full_name, note, created_at, department_id")
        .eq("status", "pending")
        .order("created_at", { ascending: true }),
      supabase
        .from("staff")
        .select("id, full_name, role, is_active, department_id")
        .order("full_name", { ascending: true }),
    ]);
    setDepts(
      Object.fromEntries((deptRes.data ?? []).map((d) => [d.id, d.name_th])),
    );
    setRequests(reqRes.data ?? []);
    setStaff(staffRes.data ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const deptName = (id: string | null) => (id ? (depts[id] ?? "—") : "—");

  async function approve(req: RequestRow) {
    if (!profile) return;
    const role = chosenRole[req.id] ?? "cs";
    setBusy(req.id);
    await supabase
      .from("access_requests")
      .update({
        status: "approved",
        approved_role: role,
        reviewed_by: profile.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", req.id);
    await recordAudit(profile.id, "confirm", "access_request", req.id, {
      approved_role: role,
      full_name: req.full_name,
    });
    setBusy(null);
    await load();
  }

  async function reject(req: RequestRow) {
    if (!profile) return;
    setBusy(req.id);
    await supabase
      .from("access_requests")
      .update({
        status: "rejected",
        reviewed_by: profile.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", req.id);
    await recordAudit(profile.id, "update", "access_request", req.id, {
      status: "rejected",
    });
    setBusy(null);
    await load();
  }

  async function setActive(row: StaffRow, isActive: boolean) {
    if (!profile) return;
    setBusy(row.id);
    await supabase
      .from("staff")
      .update({ is_active: isActive })
      .eq("id", row.id);
    await recordAudit(
      profile.id,
      isActive ? "update" : "revoke",
      "staff",
      row.id,
      { is_active: isActive },
    );
    setBusy(null);
    await load();
  }

  async function changeRole(row: StaffRow, role: StaffRole) {
    if (!profile || role === row.role) return;
    setBusy(row.id);
    await supabase.from("staff").update({ role }).eq("id", row.id);
    await recordAudit(profile.id, "update", "staff", row.id, {
      role_from: row.role,
      role_to: role,
    });
    setBusy(null);
    await load();
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-xl font-semibold text-slate-800">จัดการสิทธิ์เข้าใช้งาน</h1>

      {/* คิวคำขอรออนุมัติ */}
      <section className="mt-6">
        <h2 className="text-sm font-semibold text-slate-700">
          คำขอรออนุมัติ ({requests.length})
        </h2>
        <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {requests.length === 0 ? (
            <p className="px-5 py-6 text-sm text-slate-400">ไม่มีคำขอรออนุมัติ</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {requests.map((req) => (
                <li key={req.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-800">{req.full_name}</p>
                    <p className="text-sm text-slate-500">
                      แผนก: {deptName(req.department_id)}
                      {req.note ? ` · ${req.note}` : ""}
                    </p>
                  </div>
                  <select
                    value={chosenRole[req.id] ?? "cs"}
                    onChange={(e) =>
                      setChosenRole((m) => ({
                        ...m,
                        [req.id]: e.target.value as StaffRole,
                      }))
                    }
                    className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                  >
                    {ASSIGNABLE_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </option>
                    ))}
                  </select>
                  <button
                    disabled={busy === req.id}
                    onClick={() => void approve(req)}
                    className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    อนุมัติ
                  </button>
                  <button
                    disabled={busy === req.id}
                    onClick={() => void reject(req)}
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                  >
                    ปฏิเสธ
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* รายชื่อบัญชีผู้ใช้ */}
      <section className="mt-8">
        <h2 className="text-sm font-semibold text-slate-700">
          บัญชีผู้ใช้ ({staff.length})
        </h2>
        <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {staff.length === 0 ? (
            <p className="px-5 py-6 text-sm text-slate-400">ยังไม่มีบัญชีผู้ใช้</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {staff.map((row) => (
                <li key={row.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-800">
                      {row.full_name}
                      {!row.is_active && (
                        <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-600">
                          ถูกระงับ
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-slate-500">
                      แผนก: {deptName(row.department_id)}
                    </p>
                  </div>
                  <select
                    value={row.role}
                    disabled={row.role === "admin"}
                    onChange={(e) =>
                      void changeRole(row, e.target.value as StaffRole)
                    }
                    className="rounded-md border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-50 disabled:text-slate-400"
                  >
                    {(row.role === "admin"
                      ? (["admin"] as StaffRole[])
                      : [...ASSIGNABLE_ROLES]
                    ).map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </option>
                    ))}
                  </select>
                  {row.role !== "admin" &&
                    (row.is_active ? (
                      <button
                        disabled={busy === row.id}
                        onClick={() => void setActive(row, false)}
                        className="rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-60"
                      >
                        ระงับสิทธิ์
                      </button>
                    ) : (
                      <button
                        disabled={busy === row.id}
                        onClick={() => void setActive(row, true)}
                        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                      >
                        คืนสิทธิ์
                      </button>
                    ))}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
