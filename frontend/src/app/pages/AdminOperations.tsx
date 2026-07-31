import { useEffect, useState } from "react";
import { Activity, AlertTriangle, Bot, Database, HardDrive, Loader2, RefreshCw, ShieldCheck } from "lucide-react";

import {
  createNotificationRule,
  createOrganisationUnit,
  exportAdminUsers,
  getAdminOperations,
  getDataRequests,
  getNotificationRules,
  getPreemptiveMonitoring,
  getModelGovernance,
  getModelQuality,
  getOrganisationUnits,
  getRolePermissions,
  getSystemIncidents,
  resolveDataRequest,
  setRolePermission,
  setPreemptiveMonitoring,
  setModelGovernance,
  type ModelGovernanceSettings,
} from "../services/api";

type Operations = {
  services?: Record<string, string | boolean>;
  governance?: Record<string, string | boolean>;
  counts?: Record<string, number>;
  backup?: Record<string, unknown>;
};

export default function AdminOperations() {
  const [operations, setOperations] = useState<Operations>({});
  const [requests, setRequests] = useState<Array<Record<string, unknown>>>([]);
  const [incidents, setIncidents] = useState<Array<Record<string, unknown>>>([]);
  const [units, setUnits] = useState<Array<Record<string, unknown>>>([]);
  const [permissions, setPermissions] = useState<Array<Record<string, unknown>>>([]);
  const [rules, setRules] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [unitName, setUnitName] = useState("");
  const [permissionName, setPermissionName] = useState("reports.export");
  const [permissionRole, setPermissionRole] = useState("doctor");
  const [ruleEvent, setRuleEvent] = useState("");
  const [preemptive, setPreemptive] = useState({ enabled: false, interval_minutes: 5 });
  const [modelGovernance, setModelGovernanceState] = useState<ModelGovernanceSettings>({ enabled: true, mode: "shadow", threshold: null, false_negative_cost: 8, false_positive_cost: 1, require_consecutive: 2, require_trend_confirmation: true, drift_threshold: 3, auto_suspend: true, active_model_version: "physionet-critical-v1", retirement_reason: null });
  const [modelQuality, setModelQuality] = useState<Record<string, unknown>>({});

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [operationsResult, requestsResult, incidentsResult, unitResult, permissionResult, ruleResult, preemptiveResult, governanceResult, qualityResult] = await Promise.all([
        getAdminOperations() as Promise<Operations>,
        getDataRequests(),
        getSystemIncidents(),
        getOrganisationUnits(),
        getRolePermissions(),
        getNotificationRules(),
        getPreemptiveMonitoring(),
        getModelGovernance(),
        getModelQuality(),
      ]);
      setOperations(operationsResult);
      setRequests(requestsResult);
      setIncidents(incidentsResult);
      setUnits(unitResult);
      setPermissions(permissionResult);
      setRules(ruleResult);
      setPreemptive(preemptiveResult);
      setModelGovernanceState(governanceResult);
      setModelQuality(qualityResult);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load operations.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function downloadUsers() {
    const exportData = await exportAdminUsers();
    const url = URL.createObjectURL(new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `users-export-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="dashboard-shell space-y-6">
      <section className="glass-card rounded-3xl p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-xs font-extrabold uppercase tracking-[0.14em] text-blue-600">Administration</p><h1 className="mt-2 text-3xl font-black">Operations & governance</h1><p className="mt-2 text-sm text-slate-500">Service readiness, AI approvals, privacy requests, backups, and incidents.</p></div>
          <button onClick={load} className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-bold dark:border-slate-700"><RefreshCw className="h-4 w-4" /> Refresh</button>
        </div>
      </section>
      {error && <div role="alert" className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}
      {loading ? <div className="flex min-h-52 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-blue-600" /></div> : (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Object.entries(operations.counts ?? {}).map(([label, value]) => (
              <div key={label} className="glass-card rounded-3xl p-5"><Activity className="h-6 w-6 text-blue-600" /><p className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-500">{label.replaceAll("_", " ")}</p><p className="mt-1 text-3xl font-black">{value}</p></div>
            ))}
          </section>
          <div className="grid gap-6 xl:grid-cols-2">
            <section className="glass-card rounded-3xl p-6">
              <h2 className="flex items-center gap-2 text-xl font-extrabold"><Database className="h-5 w-5 text-blue-600" /> Service health</h2>
              <div className="mt-5 space-y-2">
                {Object.entries(operations.services ?? {}).map(([service, status]) => <div key={service} className="flex items-center justify-between rounded-xl border border-slate-200 p-3 dark:border-slate-800"><span className="font-bold capitalize">{service.replaceAll("_", " ")}</span><span className={`rounded-full px-3 py-1 text-xs font-bold ${status === "ok" || status === true || status === "enabled" || status === "configured" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{String(status)}</span></div>)}
              </div>
            </section>
            <section className="glass-card rounded-3xl p-6">
              <h2 className="flex items-center gap-2 text-xl font-extrabold"><Bot className="h-5 w-5 text-blue-600" /> AI governance gates</h2>
              <div className="mt-5 space-y-2">
                {Object.entries(operations.governance ?? {}).map(([gate, status]) => <div key={gate} className="flex items-center justify-between rounded-xl border border-slate-200 p-3 dark:border-slate-800"><span className="font-bold capitalize">{gate.replaceAll("_", " ")}</span><span className={`rounded-full px-3 py-1 text-xs font-bold ${status === true || status === "synthetic" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{String(status)}</span></div>)}
              </div>
            </section>
          </div>
          <div className="grid gap-6 xl:grid-cols-3">
            <section className="glass-card rounded-3xl p-6">
              <h2 className="text-xl font-extrabold">Organisation structure</h2>
              <div className="mt-4 flex gap-2"><input name="organisation_unit_name" aria-label="Facility or ward name" value={unitName} onChange={(event) => setUnitName(event.target.value)} placeholder="Facility or ward name" className="h-10 min-w-0 flex-1 rounded-xl border border-slate-200 px-3 text-sm" /><button disabled={!unitName} onClick={async () => { await createOrganisationUnit({ name: unitName, unit_type: "ward" }); setUnitName(""); await load(); }} className="rounded-xl bg-blue-600 px-3 text-xs font-bold text-white">Add ward</button></div>
              <div className="mt-4 space-y-2">{units.map((item) => <div key={String(item.id)} className="rounded-xl border border-slate-200 p-3 text-sm"><strong>{String(item.name)}</strong><p className="capitalize text-slate-500">{String(item.unit_type)}</p></div>)}{!units.length && <p className="text-sm text-slate-500">No organisation units configured.</p>}</div>
            </section>
            <section className="glass-card rounded-3xl p-6">
              <h2 className="text-xl font-extrabold">Granular permissions</h2>
              <div className="mt-4 grid gap-2"><select name="permission_role" aria-label="Permission role" value={permissionRole} onChange={(event) => setPermissionRole(event.target.value)} className="h-10 rounded-xl border border-slate-200 px-3 text-sm"><option>doctor</option><option>nurse</option><option>patient</option><option>admin</option></select><input name="permission_name" aria-label="Permission name" value={permissionName} onChange={(event) => setPermissionName(event.target.value)} className="h-10 rounded-xl border border-slate-200 px-3 text-sm" /><button onClick={async () => { await setRolePermission({ role: permissionRole, permission: permissionName, enabled: true }); await load(); }} className="h-10 rounded-xl bg-blue-600 text-xs font-bold text-white">Enable permission</button></div>
              <div className="mt-4 space-y-2">{permissions.map((item) => <div key={String(item.id)} className="flex justify-between rounded-xl border border-slate-200 p-3 text-sm"><span>{String(item.role)} · {String(item.permission)}</span><strong>{item.enabled ? "On" : "Off"}</strong></div>)}</div>
            </section>
            <section className="glass-card rounded-3xl p-6">
              <h2 className="text-xl font-extrabold">Escalation rules</h2>
              <div className="mt-4 flex gap-2"><input name="notification_rule_event" aria-label="Notification rule event type" value={ruleEvent} onChange={(event) => setRuleEvent(event.target.value)} placeholder="Event type" className="h-10 min-w-0 flex-1 rounded-xl border border-slate-200 px-3 text-sm" /><button disabled={!ruleEvent} onClick={async () => { await createNotificationRule({ event_type: ruleEvent, severity: "high", escalation_minutes: 15, target_role: "doctor", template: "High priority event requires review." }); setRuleEvent(""); await load(); }} className="rounded-xl bg-blue-600 px-3 text-xs font-bold text-white">Add</button></div>
              <div className="mt-4 space-y-2">{rules.map((item) => <div key={String(item.id)} className="rounded-xl border border-slate-200 p-3 text-sm"><strong>{String(item.event_type)}</strong><p className="text-slate-500">{String(item.target_role)} · {String(item.escalation_minutes)} minutes</p></div>)}</div>
            </section>
          </div>
          <section className="glass-card rounded-3xl p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-xl font-extrabold">Account lifecycle export</h2><p className="mt-1 text-sm text-slate-500">Download a password-free account inventory for governance review.</p></div><button onClick={downloadUsers} className="h-11 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white">Export users</button></div>
          </section>
          <section className="glass-card rounded-3xl p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div><h2 className="text-xl font-extrabold">Pre-emptive overdue monitoring</h2><p className="mt-1 max-w-2xl text-sm text-slate-500">Runs inside the existing API service, so no additional Render cron service is required. When disabled, no scheduled overdue-reading checks run.</p></div>
              <button
                onClick={async () => { const next = await setPreemptiveMonitoring({ ...preemptive, enabled: !preemptive.enabled }); setPreemptive(next); }}
                className={`h-11 rounded-xl px-5 text-sm font-bold text-white ${preemptive.enabled ? "bg-rose-600" : "bg-emerald-600"}`}
              >{preemptive.enabled ? "Turn off" : "Turn on"}</button>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-3"><label htmlFor="preemptive-interval" className="text-sm font-bold">Check every</label><select id="preemptive-interval" name="preemptive_interval" value={preemptive.interval_minutes} onChange={async (event) => { const next = await setPreemptiveMonitoring({ enabled: preemptive.enabled, interval_minutes: Number(event.target.value) }); setPreemptive(next); }} className="h-10 rounded-xl border border-slate-200 px-3 text-sm"><option value="1">1 minute</option><option value="5">5 minutes</option><option value="10">10 minutes</option><option value="15">15 minutes</option><option value="30">30 minutes</option><option value="60">60 minutes</option></select><span className={`rounded-full px-3 py-1 text-xs font-bold ${preemptive.enabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{preemptive.enabled ? "Enabled" : "Disabled"}</span></div>
          </section>
          <section className="glass-card rounded-3xl p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><h2 className="text-xl font-extrabold">Model governance and shadow validation</h2><p className="mt-1 max-w-3xl text-sm text-slate-500">Shadow mode stores and reconciles predictions without notifying clinicians. Deterministic urgent alerts always remain active.</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${modelGovernance.enabled ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{modelGovernance.enabled ? modelGovernance.mode : "suspended"}</span></div>
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <label className="text-sm font-bold">Operating mode<select name="model_mode" value={modelGovernance.mode} onChange={(event) => setModelGovernanceState({ ...modelGovernance, mode: event.target.value as "shadow" | "live" })} className="mt-2 h-10 w-full rounded-xl border border-slate-200 px-3 font-normal"><option value="shadow">Shadow validation</option><option value="live">Live review prompts</option></select></label>
              <label className="text-sm font-bold">Threshold<input name="model_threshold" aria-label="Model probability threshold" type="number" min="0.001" max="0.95" step="0.001" value={modelGovernance.threshold ?? ""} onChange={(event) => setModelGovernanceState({ ...modelGovernance, threshold: event.target.value ? Number(event.target.value) : null })} placeholder="Model default" className="mt-2 h-10 w-full rounded-xl border border-slate-200 px-3 font-normal" /></label>
              <label className="text-sm font-bold">Consecutive positives<select name="consecutive_predictions" value={modelGovernance.require_consecutive} onChange={(event) => setModelGovernanceState({ ...modelGovernance, require_consecutive: Number(event.target.value) })} className="mt-2 h-10 w-full rounded-xl border border-slate-200 px-3 font-normal"><option value="1">1</option><option value="2">2</option><option value="3">3</option></select></label>
              <label className="text-sm font-bold">Drift suspension score<input name="drift_threshold" type="number" min="1" max="10" step="0.5" value={modelGovernance.drift_threshold} onChange={(event) => setModelGovernanceState({ ...modelGovernance, drift_threshold: Number(event.target.value) })} className="mt-2 h-10 w-full rounded-xl border border-slate-200 px-3 font-normal" /></label>
            </div>
            <div className="mt-4 flex flex-wrap gap-3"><button onClick={async () => { const next = await setModelGovernance({ ...modelGovernance, enabled: true, reason: "Administrator approved the selected model operating mode and thresholds." }); setModelGovernanceState(next); await load(); }} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white">Save and enable</button><button onClick={async () => { const next = await setModelGovernance({ ...modelGovernance, enabled: false, reason: "Administrator manually suspended model inference pending review." }); setModelGovernanceState(next); await load(); }} className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white">Suspend model</button></div>
          </section>
          <section className="glass-card rounded-3xl p-6">
            <h2 className="text-xl font-extrabold">Live alert quality and burden</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{[["Predictions", modelQuality.predictions], ["Alerts / 100 patients", modelQuality.alerts_per_100_patients], ["Suppressed duplicates", modelQuality.duplicate_alerts_suppressed], ["False-positive reviews", modelQuality.false_positive_reviews], ["False negatives", modelQuality.false_negatives]].map(([label, value]) => <div key={String(label)} className="rounded-xl border border-slate-200 p-4"><p className="text-xs text-slate-500">{String(label)}</p><p className="mt-2 text-2xl font-black">{typeof value === "number" ? value.toFixed(1) : "—"}</p></div>)}</div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">{[["Sensitivity", modelQuality.live_sensitivity], ["Specificity", modelQuality.live_specificity], ["Precision", modelQuality.live_precision]].map(([label, value]) => <div key={String(label)} className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900"><p className="text-xs font-bold text-slate-500">{String(label)}</p><p className="mt-2 text-xl font-black">{typeof value === "number" ? `${(value * 100).toFixed(1)}%` : "Awaiting reconciled outcomes"}</p></div>)}</div>
          </section>
          <section className="glass-card rounded-3xl p-6">
            <h2 className="flex items-center gap-2 text-xl font-extrabold"><HardDrive className="h-5 w-5 text-blue-600" /> Backup assurance</h2>
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><strong>Status: {String(operations.backup?.status ?? "unknown")}</strong><p className="mt-1">Production backup jobs and restore-test results must report through the external monitoring integration.</p></div>
          </section>
          <div className="grid gap-6 xl:grid-cols-2">
            <section className="glass-card rounded-3xl p-6">
              <h2 className="flex items-center gap-2 text-xl font-extrabold"><ShieldCheck className="h-5 w-5 text-blue-600" /> Patient data-rights queue</h2>
              <div className="mt-5 space-y-3">{requests.map((item) => <div key={String(item.id)} className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-800"><div className="flex justify-between"><strong className="capitalize">{String(item.request_type)}</strong><span className="capitalize">{String(item.status)}</span></div><p className="mt-2 text-slate-500">{String(item.details ?? "")}</p>{!["fulfilled", "declined"].includes(String(item.status)) && <button onClick={async () => { await resolveDataRequest(Number(item.id), { status: "fulfilled", resolution_note: "Request completed and evidence recorded by administrator." }); await load(); }} className="mt-3 text-xs font-bold text-emerald-700">Mark fulfilled</button>}</div>)}{!requests.length && <p className="text-sm text-slate-500">No open requests.</p>}</div>
            </section>
            <section className="glass-card rounded-3xl p-6">
              <h2 className="flex items-center gap-2 text-xl font-extrabold"><AlertTriangle className="h-5 w-5 text-blue-600" /> Incident register</h2>
              <div className="mt-5 space-y-3">{incidents.map((item) => <div key={String(item.id)} className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-800"><div className="flex justify-between"><strong>{String(item.title)}</strong><span className="capitalize">{String(item.severity)}</span></div><p className="mt-2 text-slate-500">{String(item.description)}</p></div>)}{!incidents.length && <p className="text-sm text-slate-500">No incidents recorded.</p>}</div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
