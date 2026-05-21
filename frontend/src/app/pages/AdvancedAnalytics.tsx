import { useMemo } from "react";
import { useHealthData } from "../context/HealthDataContext";
import { predictDeteriorationRisk } from "../utils/predictiveRisk";
import PredictiveRiskPanel from "../components/PredictiveRiskPanel";
import PatientTimeline from "../components/PatientTimeline";
import MedicationPanel from "../components/MedicationPanel";

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
    <div className="dashboard-shell space-y-8">
      <section className="glass-card rounded-3xl p-6">
        <h1 className="text-3xl font-extrabold">Advanced Analytics</h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">
          Predictive scoring, patient timeline, and medication adherence for{" "}
          <strong>{selectedPatient.name}</strong>.
        </p>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <PredictiveRiskPanel prediction={prediction} />
        <MedicationPanel patientId={selectedPatient.id} />
      </div>

      <PatientTimeline records={patientData} />
    </div>
  );
}