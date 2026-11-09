import { useEffect, useMemo, useState } from "react";
import { Activity, Clock3, Watch } from "lucide-react";

import DataProvenanceBadge from "../components/DataProvenanceBadge";
import PatientSwitcher from "../components/PatientSwitcher";
import WithingsIntegration from "../components/WithingsIntegration";
import { useAuth } from "../context/AuthContext";
import { useHealthData } from "../context/HealthDataContext";
import { getDeviceObservations, getDeviceSyncHistory, type DeviceObservation, type DeviceSyncAttempt } from "../services/api";

const measurementLabels: Record<string, { label: string; unit: string }> = {
  heart_rate: { label: "Heart rate", unit: "bpm" },
  spo2: { label: "Oxygen saturation", unit: "%" },
  systolic_bp: { label: "Systolic blood pressure", unit: "mmHg" },
  diastolic_bp: { label: "Diastolic blood pressure", unit: "mmHg" },
  weight_kg: { label: "Weight", unit: "kg" },
};

function measurementText(name: string, value: number): string {
  const detail = measurementLabels[name];
  return detail ? `${detail.label}: ${value} ${detail.unit}` : `${name.replaceAll("_", " ")}: ${value}`;
}

export default function DevicesHub() {
  const { isPatient } = useAuth();
  const { selectedPatient, hasPatients, loading, healthData } = useHealthData();
  const [partial, setPartial] = useState<DeviceObservation[]>([]);
  const [partialError, setPartialError] = useState("");
  const [syncHistory, setSyncHistory] = useState<DeviceSyncAttempt[]>([]);
  const [syncHistoryError, setSyncHistoryError] = useState("");
  useEffect(() => {
    if (!hasPatients) return;
    let active = true;
    getDeviceObservations(selectedPatient.id)
      .then((rows) => { if (active) { setPartial(rows); setPartialError(""); } })
      .catch(() => { if (active) { setPartial([]); setPartialError("Partial device observations could not be loaded."); } });
    getDeviceSyncHistory(selectedPatient.id)
      .then((rows) => { if (active) { setSyncHistory(rows); setSyncHistoryError(""); } })
      .catch(() => { if (active) { setSyncHistory([]); setSyncHistoryError("Sync history could not be loaded."); } });
    return () => { active = false; };
  }, [hasPatients, selectedPatient.id]);
  const readings = useMemo(
    () => healthData.filter((record) => record.patientId === selectedPatient.id && (record.source === "withings" || record.source === "wearable"))
      .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp)),
    [healthData, selectedPatient.id]
  );
  const latest = readings[0];

  return (
    <div className="dashboard-shell space-y-6">
      <header className="border-b border-[var(--panel-border)] pb-6">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-700 dark:text-teal-300">Connected devices hub</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div><h1 className="text-3xl font-semibold">Devices and measurements</h1><p className="mt-2 max-w-2xl text-sm text-[var(--muted-text)]">Check the connection, the latest received reading, and where device data came from.</p></div>
          {!isPatient && <div className="w-full max-w-xs"><PatientSwitcher /></div>}
        </div>
      </header>
      {loading ? <p role="status" className="text-sm text-[var(--muted-text)]">Loading device context…</p> : !hasPatients ? (
        <section className="glass-card p-6"><h2 className="font-semibold">No linked patient record</h2><p className="mt-2 text-sm text-[var(--muted-text)]">A patient record is required to show device connections.</p></section>
      ) : (
        <>
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,1fr)]">
            <WithingsIntegration patientId={selectedPatient.id} />
            <section className="glass-card p-5 sm:p-6" aria-labelledby="device-coverage-title">
              <Watch className="h-6 w-6 text-teal-700 dark:text-teal-300" />
              <h2 id="device-coverage-title" className="mt-4 text-xl font-semibold">Measurement coverage</h2>
              <p className="mt-2 text-sm text-[var(--muted-text)]">{readings.length} device-sourced {readings.length === 1 ? "reading" : "readings"} loaded for {selectedPatient.name}.</p>
              {latest ? <div className="mt-5 border-t border-[var(--panel-border)] pt-4"><p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-text)]">Most recent device reading</p><p className="mt-2 text-lg font-semibold">{new Date(latest.timestamp).toLocaleString()}</p><div className="mt-3"><DataProvenanceBadge source={latest.source} /></div><p className="mt-4 text-xs text-[var(--muted-text)]">Coverage counts received records, not continuous monitoring time.</p></div> : <p className="mt-5 rounded-xl bg-[var(--surface-subtle)] p-4 text-sm text-[var(--muted-text)]">No device-sourced readings are available for this patient. A connection can exist before a complete measurement arrives.</p>}
            </section>
          </div>
          <section className="glass-card p-5 sm:p-6" aria-labelledby="device-readings-title">
            <div className="flex items-center gap-3"><Activity className="h-5 w-5 text-teal-700 dark:text-teal-300" /><h2 id="device-readings-title" className="text-xl font-semibold">Recent device readings</h2></div>
            <p className="mt-2 text-sm text-[var(--muted-text)]">These observations were received from a device source. Confirm timing and clinical meaning with the care record.</p>
            {readings.length > 0 && <p className="mt-2 text-xs text-[var(--muted-text)] sm:hidden">Swipe the table sideways to view every measurement.</p>}
            {readings.length ? <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[580px] text-left text-sm"><thead className="text-[var(--muted-text)]"><tr><th scope="col" className="pb-3">Recorded</th><th scope="col" className="pb-3">Source</th><th scope="col" className="pb-3">Heart rate</th><th scope="col" className="pb-3">Blood pressure</th><th scope="col" className="pb-3">Oxygen</th></tr></thead><tbody>{readings.slice(0, 12).map((reading) => <tr key={reading.id} className="border-t border-[var(--panel-border)]"><td className="py-3"><Clock3 className="mr-1 inline h-3.5 w-3.5" />{new Date(reading.timestamp).toLocaleString()}</td><td className="py-3"><DataProvenanceBadge source={reading.source} compact /></td><td className="py-3 tabular-nums">{reading.heartRate} bpm</td><td className="py-3 tabular-nums">{reading.systolicBP}/{reading.diastolicBP} mmHg</td><td className="py-3 tabular-nums">{reading.spo2}%</td></tr>)}</tbody></table></div> : <p className="mt-5 text-sm text-[var(--muted-text)]">No device readings to display.</p>}
          </section>
          <section className="glass-card p-5 sm:p-6" aria-labelledby="partial-device-title">
            <h2 id="partial-device-title" className="text-xl font-semibold">Partial device observations</h2>
            <p className="mt-2 text-sm text-[var(--muted-text)]">Only fields received from the device are shown. Missing values are not inferred; deterministic checks apply to observed fields only.</p>
            {partialError && <p role="alert" className="mt-4 text-sm text-amber-700 dark:text-amber-300">{partialError}</p>}
            {!partialError && partial.length === 0 && <p className="mt-4 text-sm text-[var(--muted-text)]">No partial observations received.</p>}
            {partial.length > 0 && <div className="mt-4 space-y-3">{partial.slice(0, 12).map((item) => <article key={item.id} className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-subtle)] p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-semibold">{new Date(item.measured_at).toLocaleString()}</span><DataProvenanceBadge source={item.source} compact /></div>
              <p className="mt-2">{Object.entries(item.measurements).map(([name, value]) => measurementText(name, value)).join(" · ")}</p>
              <p className="mt-1 text-xs text-[var(--muted-text)]">Unavailable: {item.missing_fields.length ? item.missing_fields.map((name) => name.replaceAll("_", " ")).join(", ") : "none"}. Assessment: {item.assessment_state.replaceAll("_", " ")}.</p>
            </article>)}</div>}
          </section>
          <section className="glass-card p-5 sm:p-6" aria-labelledby="device-sync-history-title">
            <h2 id="device-sync-history-title" className="text-xl font-semibold">Synchronisation history</h2>
            <p className="mt-2 text-sm text-[var(--muted-text)]">Recent provider attempts and accepted or rejected measurement groups. A failed attempt does not disconnect the device.</p>
            {syncHistoryError && <p role="alert" className="mt-4 text-sm text-amber-700 dark:text-amber-300">{syncHistoryError}</p>}
            {!syncHistoryError && syncHistory.length === 0 && <p className="mt-4 text-sm text-[var(--muted-text)]">No synchronisation attempts recorded yet.</p>}
            {syncHistory.length > 0 && <ol className="mt-4 space-y-3">{syncHistory.slice(0, 8).map((attempt) => <li key={attempt.id} className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-subtle)] p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2"><time dateTime={attempt.attempted_at} className="font-semibold">{new Date(attempt.attempted_at).toLocaleString()}</time><span className="rounded-full border border-[var(--panel-border)] px-2 py-0.5 font-medium capitalize">{attempt.state}</span></div>
              <p className="mt-2 text-[var(--muted-text)]">{attempt.accepted_complete} complete, {attempt.accepted_partial} partial and {attempt.rejected} rejected groups.</p>
              {attempt.error_message && <p className="mt-2 text-amber-700 dark:text-amber-300">{attempt.error_message}</p>}
            </li>)}</ol>}
          </section>
        </>
      )}
    </div>
  );
}
