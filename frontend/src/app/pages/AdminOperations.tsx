import { useEffect, useState } from "react";
import { Activity, AlertTriangle, Bot, Database, HardDrive, Loader2, RefreshCw, ShieldCheck } from "lucide-react";

import {
  createNotificationRule,
  createOrganisationUnit,
  exportAdminUsers,
  getAdminOperations,
  getDataRequests,
  getNotificationRules,
  getOrganisationUnits,
  getRolePermissions,
  getSystemIncidents,
  resolveDataRequest,
  setRolePermission,
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

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [operationsResult, requestsResult, incidentsResult, unitResult, permissionResult, ruleResult] = await Promise.all([
        getAdminOperations() as Promise<Operations>,
        getDataRequests(),
        getSystemIncidents(),
        getOrganisationUnits(),
        getRolePermissions(),
        getNotificationRules(),
      ]);
      setOperations(operationsResult);
      setRequests(requestsResult);
      setIncidents(incidentsResult);
      setUnits(unitResult);
      setPermissions(permissionResult);
      setRules(ruleResult);
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
              <div className="mt-4 flex gap-2"><input value={unitName} onChange={(event) => setUnitName(event.target.value)} placeholder="Facility or ward name" className="h-10 min-w-0 flex-1 rounded-xl border border-slate-200 px-3 text-sm" /><button disabled={!unitName} onClick={async () => { await createOrganisationUnit({ name: unitName, unit_type: "ward" }); setUnitName(""); await load(); }} className="rounded-xl bg-blue-600 px-3 text-xs font-bold text-white">Add ward</button></div>
              <div className="mt-4 space-y-2">{units.map((item) => <div key={String(item.id)} className="rounded-xl border border-slate-200 p-3 text-sm"><strong>{String(item.name)}</strong><p className="capitalize text-slate-500">{String(item.unit_type)}</p></div>)}{!units.length && <p className="text-sm text-slate-500">No organisation units configured.</p>}</div>
            </section>
            <section className="glass-card rounded-3xl p-6">
              <h2 className="text-xl font-extrabold">Granular permissions</h2>
              <div className="mt-4 grid gap-2"><select value={permissionRole} onChange={(event) => setPermissionRole(event.target.value)} className="h-10 rounded-xl border border-slate-200 px-3 text-sm"><option>doctor</option><option>nurse</option><option>patient</option><option>admin</option></select><input value={permissionName} onChange={(event) => setPermissionName(event.target.value)} className="h-10 rounded-xl border border-slate-200 px-3 text-sm" /><button onClick={async () => { await setRolePermission({ role: permissionRole, permission: permissionName, enabled: true }); await load(); }} className="h-10 rounded-xl bg-blue-600 text-xs font-bold text-white">Enable permission</button></div>
              <div className="mt-4 space-y-2">{permissions.map((item) => <div key={String(item.id)} className="flex justify-between rounded-xl border border-slate-200 p-3 text-sm"><span>{String(item.role)} · {String(item.permission)}</span><strong>{item.enabled ? "On" : "Off"}</strong></div>)}</div>
            </section>
            <section className="glass-card rounded-3xl p-6">
              <h2 className="text-xl font-extrabold">Escalation rules</h2>
              <div className="mt-4 flex gap-2"><input value={ruleEvent} onChange={(event) => setRuleEvent(event.target.value)} placeholder="Event type" className="h-10 min-w-0 flex-1 rounded-xl border border-slate-200 px-3 text-sm" /><button disabled={!ruleEvent} onClick={async () => { await createNotificationRule({ event_type: ruleEvent, severity: "high", escalation_minutes: 15, target_role: "doctor", template: "High priority event requires review." }); setRuleEvent(""); await load(); }} className="rounded-xl bg-blue-600 px-3 text-xs font-bold text-white">Add</button></div>
              <div className="mt-4 space-y-2">{rules.map((item) => <div key={String(item.id)} className="rounded-xl border border-slate-200 p-3 text-sm"><strong>{String(item.event_type)}</strong><p className="text-slate-500">{String(item.target_role)} · {String(item.escalation_minutes)} minutes</p></div>)}</div>
            </section>
          </div>
          <section className="glass-card rounded-3xl p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-xl font-extrabold">Account lifecycle export</h2><p className="mt-1 text-sm text-slate-500">Download a password-free account inventory for governance review.</p></div><button onClick={downloadUsers} className="h-11 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white">Export users</button></div>
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
