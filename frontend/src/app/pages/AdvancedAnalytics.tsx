import { useMemo } from "react";
import { useHealthData } from "../context/HealthDataContext";
import { predictDeteriorationRisk } from "../utils/predictiveRisk";
import PredictiveRiskPanel from "../components/PredictiveRiskPanel";
import PatientTimeline from "../components/PatientTimeline";
import MedicationPanel from "../components/MedicationPanel";
import ModelEvaluationPanel from "../components/ModelEvaluationPanel";

export default function AdvancedAnalytics() {
  const { healthData, selectedPatient } = useHealthData();

  const patientData = useMemo(
    () => healthData.filter((record) => record.patientId === selectedPatient.id),
    [healthData, selectedPatient.id]
  );

  const prediction = useMemo(
    () => predictDeteriorationRisk(patientData),
    [patientData]
  );

  return (
    <div className="dashboard-shell space-y-7">
      <header className="border-b border-[var(--panel-border)] pb-6">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-700 dark:text-violet-300">Model intelligence laboratory</p>
        <h1 className="mt-2 text-3xl font-semibold">Research model evidence</h1>
        <p className="mt-2 max-w-3xl text-sm text-[var(--muted-text)]">Inspect retrospective evaluation and its limits before reviewing patient-specific calculated signals. Research metrics do not establish clinical effectiveness.</p>
      </header>
      <ModelEvaluationPanel />
      <section className="space-y-4" aria-labelledby="analytics-patient-context"><div><p className="text-xs font-bold uppercase tracking-wide text-[var(--muted-text)]">Patient context</p><h2 id="analytics-patient-context" className="mt-1 text-xl font-semibold">{selectedPatient.name}</h2></div><div className="grid gap-6 xl:grid-cols-2"><PredictiveRiskPanel prediction={prediction} /><MedicationPanel patientId={selectedPatient.id} /></div></section>
      <PatientTimeline records={patientData} />
    </div>
  );
}
