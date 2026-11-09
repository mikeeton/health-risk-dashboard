import { Link } from "react-router";
import { CalendarClock, FileText, HeartPulse, Pill } from "lucide-react";

import DataProvenanceBadge from "../components/DataProvenanceBadge";
import WithingsIntegration from "../components/WithingsIntegration";
import { useHealthData } from "../context/HealthDataContext";

export default function PatientDashboard() {
  const { selectedPatient, hasPatients, loading, healthData } = useHealthData();
  const readings = healthData
    .filter((record) => record.patientId === selectedPatient.id)
    .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
  const latest = readings[0];

  return (
    <div className="dashboard-shell space-y-6">
      <header className="border-b border-[var(--panel-border)] pb-6">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-700 dark:text-sky-300">Personal health overview</p>
        <h1 className="mt-2 text-3xl font-semibold">My health record</h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--muted-text)]">Your recorded measurements and care information, presented with their source and time.</p>
      </header>
      {loading ? <p role="status">Loading your record…</p> : !hasPatients ? (
        <section className="glass-card p-6"><h2 className="font-semibold">No linked health record</h2><p className="mt-2 text-sm text-[var(--muted-text)]">Your account is not linked to a patient record yet. Contact your administrator.</p></section>
      ) : (
        <>
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,1fr)]">
            <section className="glass-card p-5 sm:p-7" aria-labelledby="my-measurements">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div><p className="text-xs font-bold uppercase tracking-[0.12em] text-sky-700 dark:text-sky-300">Recorded observations</p><h2 id="my-measurements" className="mt-1 text-xl font-semibold">Latest measurements</h2></div>
                {latest && (latest.source ? <DataProvenanceBadge source={latest.source} /> : <span className="text-xs text-[var(--muted-text)]">Source unavailable</span>)}
              </div>
              {latest ? (
                <>
                  <p className="mt-3 text-sm text-[var(--muted-text)]">Recorded {new Date(latest.timestamp).toLocaleString()}</p>
                  <dl className="mt-6 grid gap-3 md:grid-cols-2">
                    {[
                      ["Heart rate", latest.heartRate, "beats/min"],
                      ["Oxygen saturation", latest.spo2, "%"],
                      ["Blood pressure", latest.systolicBP != null && latest.diastolicBP != null ? `${latest.systolicBP}/${latest.diastolicBP}` : null, "mmHg"],
                      ["Steps", latest.steps, "steps"],
                    ].map(([label, value, unit]) => <div key={String(label)} className="rounded-xl bg-[var(--surface-subtle)] p-4"><dt className="text-xs font-medium text-[var(--muted-text)]">{label}</dt><dd className="mt-2 text-2xl font-semibold tabular-nums">{value ?? "Not recorded"} <span className="text-xs font-normal text-[var(--muted-text)]">{value == null ? "" : unit}</span></dd></div>)}
                  </dl>
                  <p className="mt-5 text-xs text-[var(--muted-text)]">These are recorded values, not a diagnosis. Missing or delayed readings need confirmation from their source.</p>
                </>
              ) : <p className="mt-6 text-sm text-[var(--muted-text)]">No measurements have been loaded for your record.</p>}
            </section>
            <aside className="glass-card p-5 sm:p-7" aria-labelledby="my-care-links">
              <h2 id="my-care-links" className="text-xl font-semibold">My care</h2>
              <p className="mt-2 text-sm text-[var(--muted-text)]">Review the details recorded by your care team.</p>
              <nav aria-label="Personal care sections" className="mt-6 divide-y divide-[var(--panel-border)]">
                {[
                  { label: "Medication record", href: "/#medication-adherence", icon: Pill },
                  { label: "Care timeline", href: "/#patient-timeline", icon: CalendarClock },
                  { label: "Reports and documents", href: "/care?tab=documents", icon: FileText },
                ].map(({ label, href, icon: Icon }) => <Link key={label} to={href} className="flex items-center gap-3 py-4 text-sm font-medium text-blue-700 hover:underline dark:text-blue-300"><Icon className="h-4 w-4" />{label}</Link>)}
              </nav>
            </aside>
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <section className="glass-card min-w-0 p-5 sm:p-6" aria-labelledby="reading-history"><HeartPulse className="h-5 w-5 text-sky-700 dark:text-sky-300" /><h2 id="reading-history" className="mt-3 text-lg font-semibold">Recent readings</h2><ol className="mt-4 divide-y divide-[var(--panel-border)]">{readings.slice(0, 5).map((reading) => <li key={reading.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"><span>{new Date(reading.timestamp).toLocaleString()}</span><span className="font-medium tabular-nums">{reading.heartRate} beats/min · {reading.systolicBP}/{reading.diastolicBP} mmHg</span></li>)}</ol>{!readings.length && <p className="mt-4 text-sm text-[var(--muted-text)]">There are no recent readings to display.</p>}<Link to="/" className="mt-4 inline-block text-sm font-semibold text-blue-700 dark:text-blue-300">View full health trends</Link></section>
            <div aria-label="Connected devices"><WithingsIntegration patientId={selectedPatient.id} /></div>
          </div>
        </>
      )}
    </div>
  );
}
