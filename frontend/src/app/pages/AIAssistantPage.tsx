import HealthAIAssistant from "../components/HealthAIAssistant";
import PatientSwitcher from "../components/PatientSwitcher";
import { useAuth } from "../context/AuthContext";
import { useHealthData } from "../context/HealthDataContext";

export default function AIAssistantPage() {
  const { selectedPatient } = useHealthData();
  const { isPatient, isNurse } = useAuth();

  const description = isPatient
    ? "Ask plain-language questions about your own readings, medication, and care guidance."
    : isNurse
    ? "Ask nursing-focused questions using vitals, medication data, timeline events, and risk scoring."
    : "Ask patient-specific clinical questions using live vitals, medication data, timeline events, and risk scoring.";

  return (
    <div className="dashboard-shell space-y-6">
      <header className="border-b border-[var(--panel-border)] pb-6">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-700 dark:text-violet-300">Evidence intelligence workspace</p>
        <h1 className="mt-2 text-3xl font-semibold">AI-assisted review</h1>
        <p className="mt-2 max-w-3xl text-sm text-[var(--muted-text)]">{description}</p>
      </header>
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(260px,0.65fr)]">
        <div className="min-w-0"><HealthAIAssistant patientId={selectedPatient.id} /></div>
        <aside className="space-y-4" aria-label="Evidence context">
          {!isPatient && <section className="glass-card p-5"><h2 className="text-lg font-semibold">Patient context</h2><p className="mt-2 text-sm text-[var(--muted-text)]">Choose the record used for summaries and questions.</p><div className="mt-4"><PatientSwitcher /></div></section>}
          <section className="glass-card p-5"><h2 className="text-lg font-semibold">Evidence checklist</h2><ol className="mt-3 list-decimal space-y-3 pl-5 text-sm leading-6 text-[var(--muted-text)]"><li>Check the generated time and provider state.</li><li>Open each source reference and its observation time.</li><li>Review missing information and freshness before using an answer.</li></ol></section>
          <section className="glass-card p-5"><h2 className="text-lg font-semibold">Human review</h2><p className="mt-2 text-sm leading-6 text-[var(--muted-text)]">Assistant output supports review. It is not a diagnosis or an automatic clinical instruction.</p></section>
        </aside>
      </div>
    </div>
  );
}
