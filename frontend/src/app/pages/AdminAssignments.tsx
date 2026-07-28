import { useEffect, useMemo, useState } from "react";
import { RefreshCw, UserPlus, Users } from "lucide-react";

import {
  createAdminAssignment,
  getAdminAssignmentPatients,
  getAdminAssignments,
  getAdminAssignmentStaff,
  removeAdminAssignment,
} from "../services/api";

type DirectoryPatient = {
  id: number;
  name: string;
  linked_user_id?: number | null;
  linked_user_email?: string | null;
};

type StaffUser = {
  id: number;
  email: string;
  full_name: string;
  role: "doctor" | "nurse";
  status?: string | null;
};

type StaffAssignment = {
  id: number;
  patient_id: number;
  patient_name: string;
  staff_user_id: number;
  staff_name: string;
  staff_email: string;
  role: "doctor" | "nurse";
  status: string;
  assigned_at: string;
};

export default function AdminAssignments() {
  const [patients, setPatients] = useState<DirectoryPatient[]>([]);
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [assignments, setAssignments] = useState<StaffAssignment[]>([]);
  const [patientId, setPatientId] = useState("");
  const [role, setRole] = useState<"doctor" | "nurse">("doctor");
  const [staffUserId, setStaffUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const filteredStaff = useMemo(() => {
    return staff.filter((user) => user.role === role && user.status !== "suspended");
  }, [staff, role]);

  async function loadAssignments() {
    setLoading(true);
    setError("");

    try {
      const [patientData, staffData, assignmentData] = await Promise.all([
        getAdminAssignmentPatients(),
        getAdminAssignmentStaff(),
        getAdminAssignments(),
      ]);

      setPatients(patientData);
      setStaff(staffData);
      setAssignments(assignmentData);

      if (!patientId && patientData[0]) {
        setPatientId(String(patientData[0].id));
      }

      if (!staffUserId) {
        const firstStaff = staffData.find((user: StaffUser) => user.role === role);

        if (firstStaff) setStaffUserId(String(firstStaff.id));
      }
    } catch {
      setError("Unable to load staff assignments.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAssignments();
  }, []);

  useEffect(() => {
    const selectedStaff = staff.find((user) => String(user.id) === staffUserId);

    if (selectedStaff?.role !== role) {
      const firstStaff = filteredStaff[0];
      setStaffUserId(firstStaff ? String(firstStaff.id) : "");
    }
  }, [filteredStaff, role, staff, staffUserId]);

  async function handleAssign() {
    if (!patientId || !staffUserId) {
      setError("Select a patient and staff member before assigning.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      await createAdminAssignment({
        patient_id: Number(patientId),
        staff_user_id: Number(staffUserId),
        role,
      });

      await loadAssignments();
    } catch {
      setError("Unable to create assignment. It may already exist.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(assignmentId: number) {
    setSaving(true);
    setError("");

    try {
      await removeAdminAssignment(assignmentId);
      await loadAssignments();
    } catch {
      setError("Unable to remove assignment.");
    } finally {
      setSaving(false);
    }
  }

  const activeAssignments = assignments.filter(
    (assignment) => assignment.status === "active"
  );

  return (
    <div className="dashboard-shell space-y-6">
      <section className="glass-card p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold">Staff Assignments</h1>
            <p className="mt-2 text-sm text-slate-500">
              Assign doctors and nurses to patients without exposing clinical records.
            </p>
          </div>

          <button
            onClick={loadAssignments}
            className="flex w-fit items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </section>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      <section className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        <div className="glass-card p-6">
          <div className="mb-5 flex items-center gap-3">
            <UserPlus className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-extrabold">Create Assignment</h2>
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-bold">
              Patient
              <select
                value={patientId}
                onChange={(event) => setPatientId(event.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950"
              >
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-bold">
              Staff Role
              <select
                value={role}
                onChange={(event) => setRole(event.target.value as "doctor" | "nurse")}
                className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950"
              >
                <option value="doctor">Doctor</option>
                <option value="nurse">Nurse</option>
              </select>
            </label>

            <label className="block text-sm font-bold">
              Staff Member
              <select
                value={staffUserId}
                onChange={(event) => setStaffUserId(event.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950"
              >
                {filteredStaff.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.full_name} ({user.email})
                  </option>
                ))}
              </select>
            </label>

            <button
              onClick={handleAssign}
              disabled={saving || loading || !filteredStaff.length}
              className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Assign Staff"}
            </button>
          </div>
        </div>

        <div className="glass-card overflow-hidden p-6">
          <div className="mb-5 flex items-center gap-3">
            <Users className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-extrabold">Assignment Records</h2>
          </div>

          {loading ? (
            <p className="text-sm text-slate-500">Loading assignments...</p>
          ) : activeAssignments.length === 0 ? (
            <p className="text-sm text-slate-500">No active staff assignments yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800">
                  <tr>
                    <th className="py-3">Patient</th>
                    <th className="py-3">Staff</th>
                    <th className="py-3">Role</th>
                    <th className="py-3">Assigned</th>
                    <th className="py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {activeAssignments.map((assignment) => (
                    <tr
                      key={assignment.id}
                      className="border-b border-slate-100 dark:border-slate-900"
                    >
                      <td className="py-3 font-bold">{assignment.patient_name}</td>
                      <td className="py-3">
                        <p className="font-semibold">{assignment.staff_name}</p>
                        <p className="text-xs text-slate-500">
                          {assignment.staff_email}
                        </p>
                      </td>
                      <td className="py-3 capitalize">{assignment.role}</td>
                      <td className="py-3">
                        {new Date(assignment.assigned_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => handleRemove(assignment.id)}
                          disabled={saving}
                          className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-60"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
