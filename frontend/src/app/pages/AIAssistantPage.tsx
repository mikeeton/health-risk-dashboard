import HealthAIAssistant from "../components/HealthAIAssistant";
import PatientSwitcher from "../components/PatientSwitcher";
import { useAuth } from "../context/AuthContext";
import { useHealthData } from "../context/HealthDataContext";

export default function AIAssistantPage() {
  const { selectedPatient } = useHealthData();
  const { isPatient, isNurse } = useAuth();

  const title = isPatient
    ? "My Health AI Assistant"
    : isNurse
    ? "Nursing AI Assistant"
    : "AI Clinical Assistant";

  const description = isPatient
    ? "Ask plain-language questions about your own readings, medication, and care guidance."
    : isNurse
    ? "Ask nursing-focused questions using vitals, medication data, timeline events, and risk scoring."
    : "Ask patient-specific clinical questions using live vitals, medication data, timeline events, and risk scoring.";

  return (
    <div className="dashboard-shell space-y-8">
      <section className="glass-card rounded-3xl p-6">
        <h1 className="text-3xl font-extrabold">{title}</h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">
          {description}
        </p>

        {!isPatient && (
          <div className="mt-5 max-w-md">
            <PatientSwitcher />
          </div>
        )}
      </section>

      <HealthAIAssistant patientId={selectedPatient.id} />
    </div>
  );
}
