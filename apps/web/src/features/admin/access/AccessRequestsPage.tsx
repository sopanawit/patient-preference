import { useCallback, useEffect, useState } from "react";
import { db, type AccessRequest, type Department, type Staff } from "@/data";
import { useAuth } from "@/lib/auth";
import { ASSIGNABLE_ROLES, ROLE_LABELS } from "@patient-preference/shared";
import type { StaffRole } from "@/types/database";

export function AccessRequestsPage() {
  const { profile } = useAuth();
  const [depts, setDepts] = useState<Record<string, string>>({});
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [chosenRole, setChosenRole] = useState<Record<string, StaffRole>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [deptList, reqs, staffList] = await Promise.all([
      db.departments.listAll(),
      db.access.listPendingRequests(),
      db.access.listStaff(),
    ]);
    setDepts(
      Object.fromEntries((deptList as Department[]).map((d) => [d.id, d.name_th])),
    );
    setRequests(reqs);
    setStaff(staffList);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const deptName = (id: string | null) => (id ? (depts[id] ?? "—") : "—");

  async function approve(req: AccessRequest) {
    if (!profile) return;
    setBusy(req.id);
    await db.access.approve(req.id, chosenRole[req.id] ?? "cs", profile.id);
    setBusy(null);
    await load();
  }
  async function reject(req: AccessRequest) {
    if (!profile) return;
    setBusy(req.id);
    await db.access.reject(req.id, profile.id);
    setBusy(null);
    await load();
  }
  async function setActive(row: Staff, isActive: boolean) {
    if (!profile) return;
    setBusy(row.id);
    await db.access.setActive(row.id, isActive, profile.id);
    setBusy(null);
    await load();
  }
  async function changeRole(row: Staff, role: StaffRole) {
    if (!profile || role === row.role) return;
    setBusy(row.id);
    await db.access.changeRole(row.id, role, profile.id);
    setBusy(null);
    await load();
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-xl font-semibold text-slate-800">จัดการสิทธิ์เข้าใช้งาน</h1>

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

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-slate-700">
          บัญชีผู้ใช้ ({staff.length})
        </h2>
        <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white">
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
                  onChange={(e) => void changeRole(row, e.target.value as StaffRole)}
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
        </div>
      </section>
    </div>
  );
}
