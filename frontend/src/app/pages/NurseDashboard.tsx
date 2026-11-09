import { useEffect, useState } from "react";
import { Link } from "react-router";
import { ArrowRight, CalendarClock, ClipboardCheck, Pill } from "lucide-react";

import { useHealthData } from "../context/HealthDataContext";
import {
  getCareTasks,
  getMedicationAdministrations,
  getObservationSchedules,
  type CareTask,
} from "../services/api";

type Schedule = { id: number; metric: string; next_due_at: string; active: boolean };
type Administration = { id: number; status: string; scheduled_at: string };

function dateTime(value?: string) {
  if (!value) return "Time not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Time not recorded" : date.toLocaleString();
}

export default function NurseDashboard() {
  const { patients, selectedPatient, hasPatients, loading, healthData } = useHealthData();
  const [tasks, setTasks] = useState<CareTask[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [administrations, setAdministrations] = useState<Administration[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!hasPatients) return;
    let active = true;
    setTasks([]);
    setSchedules([]);
    setAdministrations([]);
    setError("");
    void Promise.allSettled([
      getCareTasks(selectedPatient.id),
      getObservationSchedules(selectedPatient.id),
      getMedicationAdministrations(selectedPatient.id),
    ]).then(([taskResult, scheduleResult, administrationResult]) => {
      if (!active) return;
      if (taskResult.status === "fulfilled") setTasks(taskResult.value);
      if (scheduleResult.status === "fulfilled") setSchedules(scheduleResult.value as Schedule[]);
      if (administrationResult.status === "fulfilled") setAdministrations(administrationResult.value as Administration[]);
      if ([taskResult, scheduleResult, administrationResult].some((result) => result.status === "rejected")) {
        setError("Some care activity could not be loaded. Open the care workspace to retry.");
      }
    });
    return () => { active = false; };
  }, [hasPatients, selectedPatient.id]);

  const activeTasks = tasks.filter((task) => !["completed", "cancelled"].includes(task.status.toLowerCase()));
  const activeSchedules = schedules.filter((schedule) => schedule.active);
  const recentAdministrations = [...administrations].sort(
    (a, b) => Date.parse(b.scheduled_at) - Date.parse(a.scheduled_at)
  ).slice(0, 3);

  return (
    <div className="dashboard-shell space-y-6">
      <header className="border-b border-[var(--panel-border)] pb-6">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-700 dark:text-teal-300">Care workflow centre</p>
        <h1 className="mt-2 text-3xl font-semibold">Nursing worklist</h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--muted-text)]">Assigned patients, due observations and documented care activity in one task-focused view.</p>
      </header>
      {loading ? <p role="status">Loading assigned patients…</p> : !hasPatients ? (
        <section className="glass-card p-6"><h2 className="font-semibold">No assigned patients</h2><p className="mt-2 text-sm text-[var(--muted-text)]">Ask an administrator to assign a patient before using this worklist.</p></section>
      ) : (
        <>
          {error && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">{error}</p>}
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,1fr)]">
            <section className="glass-card overflow-hidden" aria-labelledby="nurse-caseload">
              <div className="flex items-center justify-between border-b border-[var(--panel-border)] p-5">
                <div><h2 id="nurse-caseload" className="text-lg font-semibold">Assigned patient worklist</h2><p className="mt-1 text-xs text-[var(--muted-text)]">{patients.length} accessible patient{patients.length === 1 ? "" : "s"}</p></div>
                <Link to="/care" className="text-sm font-semibold text-blue-700 dark:text-blue-300">Open care workspace</Link>
              </div>
              <div className="overflow-x-auto"><table className="w-full min-w-[500px] text-left text-sm"><thead className="bg-[var(--surface-subtle)] text-xs text-[var(--muted-text)]"><tr><th className="px-5 py-3">Patient</th><th className="px-5 py-3">Recorded risk</th><th className="px-5 py-3">Latest observation</th></tr></thead><tbody>{patients.map((patient) => {
                const latest = healthData.filter((record) => record.patientId === patient.id).sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))[0];
                return <tr key={patient.id} className="border-t border-[var(--panel-border)]"><th scope="row" className="px-5 py-4 font-semibold">{patient.name}{patient.id === selectedPatient.id && <span className="ml-2 text-xs font-normal text-teal-700 dark:text-teal-300">Selected</span>}</th><td className="px-5 py-4">{patient.riskLevel}</td><td className="px-5 py-4 text-[var(--muted-text)]">{latest ? dateTime(latest.timestamp) : "No observation loaded"}</td></tr>;
              })}</tbody></table></div>
            </section>
            <aside className="glass-card p-5" aria-labelledby="nurse-focus">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-teal-700 dark:text-teal-300">Selected patient</p>
              <h2 id="nurse-focus" className="mt-2 text-xl font-semibold">{selectedPatient.name}</h2>
              <p className="mt-1 text-sm text-[var(--muted-text)]">{selectedPatient.condition}</p>
              <dl className="mt-6 divide-y divide-[var(--panel-border)] text-sm">
                <div className="flex justify-between py-3"><dt>Open tasks</dt><dd className="font-semibold">{activeTasks.length}</dd></div>
                <div className="flex justify-between py-3"><dt>Active observation schedules</dt><dd className="font-semibold">{activeSchedules.length}</dd></div>
                <div className="flex justify-between py-3"><dt>Administration records loaded</dt><dd className="font-semibold">{administrations.length}</dd></div>
              </dl>
            </aside>
          </div>
          <div className="grid gap-5 lg:grid-cols-3">
            <section className="glass-card p-5" aria-labelledby="nurse-tasks"><ClipboardCheck className="h-5 w-5 text-teal-700 dark:text-teal-300" /><h2 id="nurse-tasks" className="mt-3 text-lg font-semibold">Tasks to review</h2><ul className="mt-4 divide-y divide-[var(--panel-border)]">{activeTasks.slice(0, 4).map((task) => <li key={task.id} className="py-3 text-sm"><p className="font-medium">{task.title}</p><p className="mt-1 text-xs text-[var(--muted-text)]">{task.priority} priority · {task.status} · {dateTime(task.due_at ?? undefined)}</p></li>)}</ul>{!activeTasks.length && <p className="mt-4 text-sm text-[var(--muted-text)]">No open tasks returned for this patient.</p>}<Link to="/care?tab=tasks" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 dark:text-blue-300">Manage tasks <ArrowRight className="h-4 w-4" /></Link></section>
            <section className="glass-card p-5" aria-labelledby="nurse-schedule"><CalendarClock className="h-5 w-5 text-teal-700 dark:text-teal-300" /><h2 id="nurse-schedule" className="mt-3 text-lg font-semibold">Observation schedule</h2><ul className="mt-4 divide-y divide-[var(--panel-border)]">{activeSchedules.slice(0, 4).map((schedule) => <li key={schedule.id} className="py-3 text-sm"><p className="font-medium capitalize">{schedule.metric.replaceAll("_", " ")}</p><p className="mt-1 text-xs text-[var(--muted-text)]">Next due {dateTime(schedule.next_due_at)}</p></li>)}</ul>{!activeSchedules.length && <p className="mt-4 text-sm text-[var(--muted-text)]">No active schedule returned.</p>}<Link to="/care?tab=clinical" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 dark:text-blue-300">View clinical operations <ArrowRight className="h-4 w-4" /></Link></section>
            <section className="glass-card p-5" aria-labelledby="nurse-medication"><Pill className="h-5 w-5 text-teal-700 dark:text-teal-300" /><h2 id="nurse-medication" className="mt-3 text-lg font-semibold">Medication activity</h2><ul className="mt-4 divide-y divide-[var(--panel-border)]">{recentAdministrations.map((item) => <li key={item.id} className="py-3 text-sm"><p className="font-medium capitalize">{item.status.replaceAll("_", " ")}</p><p className="mt-1 text-xs text-[var(--muted-text)]">Scheduled {dateTime(item.scheduled_at)}</p></li>)}</ul>{!recentAdministrations.length && <p className="mt-4 text-sm text-[var(--muted-text)]">No administration records returned.</p>}<Link to="/care?tab=clinical" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 dark:text-blue-300">Review medication record <ArrowRight className="h-4 w-4" /></Link></section>
          </div>
        </>
      )}
    </div>
  );
}
