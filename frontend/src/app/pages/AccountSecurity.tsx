import { useEffect, useState } from "react";
import { KeyRound, Loader2, Save, ShieldCheck, Smartphone, UserRound } from "lucide-react";

import {
  changeOwnPassword,
  confirmMFA,
  disableMFA,
  enrolMFA,
  getCareProfile,
  getOwnSessions,
  revokeOwnSession,
  updateCareProfile,
} from "../services/api";

type Session = {
  id: number;
  created_at: string;
  expires_at: string;
  revoked_at?: string | null;
};

const inputClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950";

export default function AccountSecurity() {
  const [profile, setProfile] = useState<Record<string, unknown>>({});
  const [sessions, setSessions] = useState<Session[]>([]);
  const [passwords, setPasswords] = useState({ current_password: "", new_password: "" });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [mfaEnrollment, setMfaEnrollment] = useState<{ secret: string; otpauth_uri: string } | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaPassword, setMfaPassword] = useState("");

  async function load() {
    setLoading(true);
    try {
      const [profileResult, sessionsResult] = await Promise.all([
        getCareProfile(),
        getOwnSessions(),
      ]);
      setProfile(profileResult);
      setSessions(sessionsResult);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load account settings.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const patientProfile =
    profile.patient_profile && typeof profile.patient_profile === "object"
      ? (profile.patient_profile as Record<string, unknown>)
      : {};

  async function saveProfile() {
    setError("");
    try {
      const result = await updateCareProfile({
        full_name: profile.full_name,
        phone: profile.phone,
        job_title: profile.job_title,
        department: profile.department,
        organisation: profile.organisation,
        address: patientProfile.address,
        emergency_contact_name: patientProfile.emergency_contact_name,
        emergency_contact_phone: patientProfile.emergency_contact_phone,
        gp_name: patientProfile.gp_name,
        gp_practice: patientProfile.gp_practice,
      });
      setProfile(result);
      setMessage("Profile saved.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to save profile.");
    }
  }

  async function changePassword() {
    setError("");
    try {
      await changeOwnPassword(passwords);
      setPasswords({ current_password: "", new_password: "" });
      setMessage("Password changed. Existing sessions were revoked; sign in again.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to change password.");
    }
  }

  if (loading) {
    return <div className="flex min-h-64 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-blue-600" /></div>;
  }

  return (
    <div className="dashboard-shell space-y-6">
      <section className="glass-card rounded-3xl p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white"><ShieldCheck className="h-6 w-6" /></div>
          <div><h1 className="text-3xl font-black">Profile & security</h1><p className="mt-1 text-sm text-slate-500">Identity, contact details, password, MFA status, and active sessions.</p></div>
        </div>
      </section>
      {message && <div className="rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">{message}</div>}
      {error && <div role="alert" className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="glass-card rounded-3xl p-6">
          <h2 className="flex items-center gap-2 text-xl font-extrabold"><UserRound className="h-5 w-5 text-blue-600" /> Profile</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {[
              ["full_name", "Full name"],
              ["phone", "Phone"],
              ["job_title", "Job title"],
              ["department", "Department"],
              ["organisation", "Organisation"],
            ].map(([field, label]) => (
              <label key={field} className="text-xs font-bold text-slate-500">{label}<input className={`${inputClass} mt-1`} value={String(profile[field] ?? "")} onChange={(event) => setProfile({ ...profile, [field]: event.target.value })} /></label>
            ))}
          </div>
          {profile.role === "patient" && (
            <div className="mt-5 border-t border-slate-200 pt-5 dark:border-slate-800">
              <h3 className="font-extrabold">Patient and emergency details</h3>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {[
                  ["address", "Address"],
                  ["emergency_contact_name", "Emergency contact"],
                  ["emergency_contact_phone", "Emergency phone"],
                  ["gp_name", "GP name"],
                  ["gp_practice", "GP practice"],
                ].map(([field, label]) => (
                  <label key={field} className="text-xs font-bold text-slate-500">{label}<input className={`${inputClass} mt-1`} value={String(patientProfile[field] ?? "")} onChange={(event) => setProfile({ ...profile, patient_profile: { ...patientProfile, [field]: event.target.value } })} /></label>
                ))}
              </div>
            </div>
          )}
          <button onClick={saveProfile} className="mt-5 flex h-11 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white"><Save className="h-4 w-4" /> Save profile</button>
        </section>

        <section className="glass-card rounded-3xl p-6">
          <h2 className="flex items-center gap-2 text-xl font-extrabold"><KeyRound className="h-5 w-5 text-blue-600" /> Password</h2>
          <div className="mt-5 space-y-3">
            <input type="password" className={inputClass} value={passwords.current_password} onChange={(event) => setPasswords({ ...passwords, current_password: event.target.value })} placeholder="Current password" />
            <input type="password" className={inputClass} value={passwords.new_password} onChange={(event) => setPasswords({ ...passwords, new_password: event.target.value })} placeholder="New strong password" />
            <p className="text-xs leading-5 text-slate-500">At least 12 characters with upper/lowercase letters, a number, and a symbol.</p>
            <button disabled={!passwords.current_password || !passwords.new_password} onClick={changePassword} className="h-11 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white disabled:opacity-50">Change password</button>
          </div>
          <div className={`mt-6 rounded-2xl border p-4 text-sm ${profile.mfa_enabled ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
            <div className="flex items-center gap-2 font-extrabold"><Smartphone className="h-4 w-4" /> MFA status: {profile.mfa_enabled ? "Enabled" : "Not enrolled"}</div>
            {!profile.mfa_enabled && !mfaEnrollment && <button onClick={async () => setMfaEnrollment(await enrolMFA())} className="mt-3 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white">Set up authenticator</button>}
            {mfaEnrollment && (
              <div className="mt-3 space-y-3">
                <p>Add this secret to your authenticator application:</p>
                <code className="block break-all rounded-lg bg-white p-3 text-xs text-slate-900">{mfaEnrollment.secret}</code>
                <input value={mfaCode} onChange={(event) => setMfaCode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="Current 6-digit code" className={inputClass} />
                <button disabled={mfaCode.length !== 6} onClick={async () => { await confirmMFA(mfaCode); setMfaEnrollment(null); setMfaCode(""); await load(); }} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Confirm and enable</button>
              </div>
            )}
            {Boolean(profile.mfa_enabled) && (
              <div className="mt-3 grid gap-2">
                <input type="password" value={mfaPassword} onChange={(event) => setMfaPassword(event.target.value)} placeholder="Password to disable MFA" className={inputClass} />
                <input value={mfaCode} onChange={(event) => setMfaCode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="Current 6-digit code" className={inputClass} />
                <button disabled={!mfaPassword || mfaCode.length !== 6} onClick={async () => { await disableMFA(mfaPassword, mfaCode); setMfaPassword(""); setMfaCode(""); await load(); }} className="w-fit rounded-lg border border-red-300 px-3 py-2 text-xs font-bold text-red-700 disabled:opacity-50">Disable MFA</button>
              </div>
            )}
          </div>
        </section>
      </div>

      <section className="glass-card rounded-3xl p-6">
        <h2 className="text-xl font-extrabold">Active sessions</h2>
        <div className="mt-5 space-y-3">
          {sessions.map((session) => (
            <div key={session.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="font-bold">Session #{session.id}</p><p className="text-xs text-slate-500">Created {new Date(session.created_at).toLocaleString()} · expires {new Date(session.expires_at).toLocaleString()}</p></div>
              <button disabled={Boolean(session.revoked_at)} onClick={async () => { await revokeOwnSession(session.id); await load(); }} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700 disabled:opacity-40">{session.revoked_at ? "Revoked" : "Revoke"}</button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
