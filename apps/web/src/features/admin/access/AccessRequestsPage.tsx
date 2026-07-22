import { useCallback, useEffect, useState } from "react";
import { db, type AccessRequest, type Department, type Staff } from "@/data";
import { useAuth } from "@/lib/auth";
import { ASSIGNABLE_ROLES, ROLE_LABELS } from "@patient-preference/shared";
import type { StaffRole } from "@/types/database";

export function AccessRequestsPage() {
  const { profile } = useAuth();
  const [depts, setDepts] = useState<Record<string, string>>({});
  const [deptList, setDeptList] = useState<Department[]>([]);
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [chosenRole, setChosenRole] = useState<Record<string, StaffRole>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    full_name: "",
    email: "",
    department_id: "",
  });
  const [editError, setEditError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [depList, reqs, staffList] = await Promise.all([
      db.departments.listAll(),
      db.access.listPendingRequests(),
      db.access.listStaff(),
    ]);
    setDeptList(depList as Department[]);
    setDepts(
      Object.fromEntries((depList as Department[]).map((d) => [d.id, d.name_th])),
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
  function startEdit(row: Staff) {
    setEditError(null);
    setEditId(row.id);
    setEditForm({
      full_name: row.full_name,
      email: row.email ?? "",
      department_id: row.department_id ?? "",
    });
  }
  async function saveEdit(row: Staff) {
    if (!profile) return;
    setEditError(null);
    setBusy(row.id);
    const { error } = await db.access.updateUser(
      row.id,
      {
        full_name: editForm.full_name.trim(),
        email: editForm.email.trim() || undefined,
        department_id: editForm.department_id || null,
      },
      profile.id,
    );
    setBusy(null);
    if (error) {
      setEditError(error);
      return;
    }
    setEditId(null);
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
                <li
                  key={req.id}
                  className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:flex-wrap sm:items-center"
                >
                  <div className="min-w-0 flex-1">
                    <p className="break-words font-medium text-slate-800">
                      {req.full_name}
                    </p>
                    <p className="break-words text-sm text-slate-500">
                      แผนก: {deptName(req.department_id)}
                      {req.note ? ` · ${req.note}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
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
                      className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-brand-50 disabled:opacity-60"
                    >
                      ปฏิเสธ
                    </button>
                  </div>
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
            {staff.map((row) =>
              editId === row.id ? (
                <li key={row.id} className="px-5 py-4">
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-slate-700">
                      ชื่อ-สกุล
                      <input
                        value={editForm.full_name}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, full_name: e.target.value }))
                        }
                        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                      />
                    </label>
                    <label className="block text-sm font-medium text-slate-700">
                      อีเมล (ใช้ล็อกอิน)
                      <input
                        type="email"
                        value={editForm.email}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, email: e.target.value }))
                        }
                        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                      />
                    </label>
                    <label className="block text-sm font-medium text-slate-700">
                      แผนกต้นสังกัด
                      <select
                        value={editForm.department_id}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            department_id: e.target.value,
                          }))
                        }
                        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      >
                        <option value="">— ไม่ระบุ —</option>
                        {deptList.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name_th}
                          </option>
                        ))}
                      </select>
                    </label>
                    {editError && (
                      <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                        {editError}
                      </p>
                    )}
                    <div className="flex gap-2">
                      <button
                        disabled={busy === row.id}
                        onClick={() => void saveEdit(row)}
                        className="rounded-md bg-brand-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
                      >
                        {busy === row.id ? "กำลังบันทึก…" : "บันทึก"}
                      </button>
                      <button
                        onClick={() => setEditId(null)}
                        className="rounded-md border border-slate-300 px-4 py-1.5 text-sm text-slate-600 hover:bg-brand-50"
                      >
                        ยกเลิก
                      </button>
                    </div>
                  </div>
                </li>
              ) : (
                <li
                  key={row.id}
                  className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:flex-wrap sm:items-center"
                >
                  <div className="min-w-0 flex-1">
                    <p className="break-words font-medium text-slate-800">
                      {row.full_name}
                      {!row.is_active && (
                        <span className="ml-2 whitespace-nowrap rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-600">
                          ถูกระงับ
                        </span>
                      )}
                    </p>
                    <p className="break-words text-sm text-slate-500">
                      {row.email ? `${row.email} · ` : ""}แผนก: {deptName(row.department_id)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => startEdit(row)}
                      className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-brand-50"
                    >
                      แก้ไข
                    </button>
                    <select
                      value={row.role}
                      disabled={row.role === "admin"}
                      onChange={(e) => void changeRole(row, e.target.value as StaffRole)}
                      className="rounded-md border border-slate-300 px-2 py-1.5 text-sm disabled:bg-brand-50 disabled:text-slate-400"
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
                          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-brand-50 disabled:opacity-60"
                        >
                          คืนสิทธิ์
                        </button>
                      ))}
                  </div>
                </li>
              ),
            )}
          </ul>
        </div>
      </section>
    </div>
  );
}
