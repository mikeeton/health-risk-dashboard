import HealthAIAssistant from "../components/HealthAIAssistant";
import PatientSwitcher from "../components/PatientSwitcher";
import { useHealthData } from "../context/HealthDataContext";

export default function AIAssistantPage() {
  const { selectedPatient } = useHealthData();

  return (
    <div className="dashboard-shell space-y-8">
      <section className="glass-card rounded-3xl p-6">
        <h1 className="text-3xl font-extrabold">AI Clinical Assistant</h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">
          Ask patient-specific questions using live vitals, medication data,
          timeline events, and risk scoring.
        </p>

        <div className="mt-5 max-w-md">
          <PatientSwitcher />
        </div>
      </section>

      <HealthAIAssistant patientId={selectedPatient.id} />
    </div>
  );
}