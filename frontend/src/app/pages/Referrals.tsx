import { type FormEvent, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  FileQuestion,
  Loader2,
  RefreshCw,
  Send,
  ShieldCheck,
  XCircle,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { useHealthData } from "../context/HealthDataContext";
import {
  approveReferral,
  createReferral,
  getReferralStaff,
  getReferrals,
  rejectReferral,
  requestReferralMoreInfo,
  type ReferralPayload,
} from "../services/api";

type StaffUser = {
  id: number;
  email: string;
  full_name: string;
  role: "doctor" | "nurse";
  status?: string | null;
};

type Referral = {
  id: number;
  patient_id: number;
  patient_name: string;
  referring_name: string;
  referring_email: string;
  receiving_user_id?: number | null;
  receiving_name?: string | null;
  receiving_email?: string | null;
  receiving_role?: string | null;
  receiving_department?: string | null;
  reason: string;
  urgency: "Low" | "Medium" | "High" | "Critical";
  notes?: string | null;
  status: string;
  admin_note?: string | null;
  requested_at: string;
};

const urgencyStyles: Record<Referral["urgency"], string> = {
  Low: "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-300",
  Medium: "bg-yellow-50 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-300",
  High: "bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-300",
  Critical: "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300",
};

export default function Referrals() {
  const { user } = useAuth();
  const { patients } = useHealthData();
  const isAdmin = user?.role === "admin";

  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [patientId, setPatientId] = useState("");
  const [receivingUserId, setReceivingUserId] = useState("");
  const [department, setDepartment] = useState("");
  const [urgency, setUrgency] = useState<Referral["urgency"]>("Medium");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [reviewNotes, setReviewNotes] = useState<Record<number, string>>({});

  const visibleReferrals = useMemo(() => {
    // The server already supports status filtering, but keeping this memoized
    // client-side filter makes the UI resilient if cached data is reused.
    if (statusFilter === "all") return referrals;
    return referrals.filter((item) => item.status === statusFilter);
  }, [referrals, statusFilter]);

  async function loadReferrals() {
    setLoading(true);
    setMessage("");

    try {
      // Clinicians and admins share the same page component. The backend decides
      // which referrals each role can see.
      const [staffData, referralData] = await Promise.all([
        getReferralStaff(),
        getReferrals(statusFilter === "all" ? undefined : statusFilter),
      ]);

      setStaff(staffData);
      setReferrals(referralData);

      if (!patientId && patients[0]) {
        setPatientId(String(patients[0].id));
      }
    } catch {
      setMessage("Unable to load referral data. Check the backend and database.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReferrals();
  }, [statusFilter, patients.length]);

  async function submitReferral(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    const payload: ReferralPayload = {
      // The backend validates that the current clinician can already access the
      // patient before accepting the referral request.
      patient_id: Number(patientId),
      receiving_user_id: receivingUserId ? Number(receivingUserId) : null,
      receiving_department: department.trim() || null,
      urgency,
      reason: reason.trim(),
      notes: notes.trim() || null,
    };

    try {
      await createReferral(payload);
      setMessage("Referral request submitted for admin review.");
      setReason("");
      setNotes("");
      setDepartment("");
      setReceivingUserId("");
      await loadReferrals();
    } catch {
      setMessage("Could not submit referral. Choose a patient and receiving clinician or department.");
    } finally {
      setSaving(false);
    }
  }

  async function reviewReferral(
    referralId: number,
    action: "approve" | "reject" | "more-info"
  ) {
    setSaving(true);
    setMessage("");

    const payload = {
      // Admin notes are optional but useful for rejection or more-info decisions.
      admin_note: reviewNotes[referralId]?.trim() || null,
    };

    try {
      if (action === "approve") await approveReferral(referralId, payload);
      if (action === "reject") await rejectReferral(referralId, payload);
      if (action === "more-info") await requestReferralMoreInfo(referralId, payload);

      setMessage("Referral review saved.");
      await loadReferrals();
    } catch {
      setMessage("Could not update referral.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="dashboard-shell space-y-6">
      <section className="glass-card p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/25">
              <FileQuestion className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold">
                {isAdmin ? "Referral Approvals" : "Patient Referrals"}
              </h1>
              <p className="mt-1 text-slate-500">
                {isAdmin
                  ? "Review referral requests without opening private clinical records."
                  : "Refer assigned patients for additional care or specialist review."}
              </p>
            </div>
          </div>

          <button
            onClick={loadReferrals}
            disabled={loading}
            className="flex w-fit items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-bold shadow-sm hover:bg-slate-50 disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh
          </button>
        </div>

        {message && (
          <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-300">
            {message}
          </div>
        )}
      </section>

      {!isAdmin && (
        <section className="glass-card p-6">
          <div className="mb-5 flex items-center gap-3">
            <Send className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-extrabold">Create Referral Request</h2>
          </div>

          <form onSubmit={submitReferral} className="grid gap-4 lg:grid-cols-2">
            <label className="block text-sm font-bold">
              Patient
              <select name="referral_patient" aria-label="Referral patient"
                value={patientId}
                onChange={(event) => setPatientId(event.target.value)}
                required
                className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-950"
              >
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-bold">
              Receiving Clinician
              <select name="referral_recipient" aria-label="Receiving clinician"
                value={receivingUserId}
                onChange={(event) => setReceivingUserId(event.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-950"
              >
                <option value="">Department referral instead</option>
                {staff
                  .filter((staffUser) => staffUser.id !== user?.id)
                  .map((staffUser) => (
                    <option key={staffUser.id} value={staffUser.id}>
                      {staffUser.full_name} ({staffUser.role})
                    </option>
                  ))}
              </select>
            </label>

            <label className="block text-sm font-bold">
              Department
              <input name="referral_department" aria-label="Referral department"
                value={department}
                onChange={(event) => setDepartment(event.target.value)}
                placeholder="e.g. Cardiology"
                className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-950"
              />
            </label>

            <label className="block text-sm font-bold">
              Urgency
              <select name="referral_urgency" aria-label="Referral urgency"
                value={urgency}
                onChange={(event) => setUrgency(event.target.value as Referral["urgency"])}
                className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-950"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </label>

            <label className="block text-sm font-bold lg:col-span-2">
              Reason
              <input name="referral_reason" aria-label="Referral reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                minLength={5}
                maxLength={500}
                required
                placeholder="Short reason for referral"
                className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-950"
              />
            </label>

            <label className="block text-sm font-bold lg:col-span-2">
              Supporting Notes
              <textarea name="referral_notes" aria-label="Referral notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={4}
                maxLength={2000}
                className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-950"
              />
            </label>

            <button
              type="submit"
              disabled={saving || loading}
              className="flex w-fit items-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Submit Referral
            </button>
          </form>
        </section>
      )}

      <section className="glass-card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-6 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-extrabold">Referral History</h2>
            <p className="mt-1 text-sm text-slate-500">
              {visibleReferrals.length} matching request(s)
            </p>
          </div>

          <select name="referral_status_filter" aria-label="Filter referrals by status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="w-fit rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold dark:border-slate-800 dark:bg-slate-950"
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="more_info">More information</option>
          </select>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {loading ? (
            <div className="flex items-center gap-2 p-6 text-sm font-semibold text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading referrals...
            </div>
          ) : visibleReferrals.length === 0 ? (
            <p className="p-6 text-sm text-slate-500">No referral requests found.</p>
          ) : (
            visibleReferrals.map((referral) => (
              <div key={referral.id} className="p-6">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-extrabold">{referral.patient_name}</h3>
                      <span className={`rounded-full px-3 py-1 text-xs font-black ${urgencyStyles[referral.urgency]}`}>
                        {referral.urgency}
                      </span>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                        {referral.status.replace("_", " ")}
                      </span>
                    </div>

                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                      {referral.reason}
                    </p>
                    {referral.notes && (
                      <p className="mt-2 text-sm text-slate-500">{referral.notes}</p>
                    )}
                    <p className="mt-3 text-xs font-semibold text-slate-500">
                      From {referral.referring_name} to{" "}
                      {referral.receiving_name ||
                        referral.receiving_department ||
                        "unassigned department"}{" "}
                      · {new Date(referral.requested_at).toLocaleString()}
                    </p>
                    {referral.admin_note && (
                      <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                        Admin note: {referral.admin_note}
                      </p>
                    )}
                  </div>

                  {isAdmin && referral.status === "pending" && (
                    /* Admin review never displays clinical vitals or diagnoses.
                       Approval only changes access by creating an assignment. */
                    <div className="w-full max-w-md space-y-3">
                      <textarea name={`referral_review_${referral.id}`} aria-label="Referral review notes"
                        value={reviewNotes[referral.id] ?? ""}
                        onChange={(event) =>
                          setReviewNotes((current) => ({
                            ...current,
                            [referral.id]: event.target.value,
                          }))
                        }
                        placeholder="Optional admin note"
                        rows={3}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950"
                      />
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          onClick={() => reviewReferral(referral.id, "approve")}
                          disabled={saving}
                          className="flex items-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-xs font-bold text-white hover:bg-green-700 disabled:opacity-60"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Approve
                        </button>
                        <button
                          onClick={() => reviewReferral(referral.id, "more-info")}
                          disabled={saving}
                          className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold hover:bg-slate-50 disabled:opacity-60 dark:border-slate-800 dark:hover:bg-slate-900"
                        >
                          <ShieldCheck className="h-4 w-4" />
                          More Info
                        </button>
                        <button
                          onClick={() => reviewReferral(referral.id, "reject")}
                          disabled={saving}
                          className="flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-60"
                        >
                          <XCircle className="h-4 w-4" />
                          Reject
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
