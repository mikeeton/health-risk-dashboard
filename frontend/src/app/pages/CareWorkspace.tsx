import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileSignature,
  HeartHandshake,
  Loader2,
  MessageSquareText,
  Plus,
  RefreshCw,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";

import PatientSwitcher from "../components/PatientSwitcher";
import { useAuth } from "../context/AuthContext";
import { useHealthData } from "../context/HealthDataContext";
import {
  createAppointment,
  createCareTask,
  createClinicalDocument,
  createDataRequest,
  createNursingAssessment,
  createObservationSchedule,
  createPatientOutcome,
  exportPatientRecord,
  getAppointments,
  getAlertWorkflows,
  getCareMessages,
  getCareTasks,
  getCareTeam,
  getClinicalDocuments,
  getConsents,
  getInvestigations,
  getMedicationSafety,
  getMedicationAdministrations,
  getMedications,
  getNursingAssessments,
  getObservationSchedules,
  getPatientOutcomes,
  recordConsent,
  recordMedicationAdministration,
  orderInvestigation,
  sendCareMessage,
  signClinicalDocument,
  updateAppointment,
  updateAlertWorkflow,
  updateCareTask,
  type CareAppointment,
  type CareMessage,
  type CareTask,
  type ClinicalDocument,
  type ConsentRecord,
} from "../services/api";

type TeamMember = {
  id: number;
  full_name: string;
  email: string;
  role: string;
};

const tabs = [
  ["overview", "Overview"],
  ["appointments", "Appointments"],
  ["messages", "Messages"],
  ["tasks", "Tasks"],
  ["documents", "Clinical records"],
  ["clinical", "Clinical operations"],
  ["privacy", "Privacy & outcomes"],
] as const;

function Panel({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof CalendarDays;
  children: React.ReactNode;
}) {
  return (
    <section className="glass-card rounded-3xl p-5 sm:p-6">
      <header className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
          <Icon className="h-5 w-5" />
        </div>
        <h2 className="text-xl font-extrabold">{title}</h2>
      </header>
      {children}
    </section>
  );
}

const inputClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950";
const textareaClass =
  "min-h-24 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-950";
const primaryButton =
  "flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50";

export default function CareWorkspace() {
  const { user, isPatient, isDoctor, isNurse } = useAuth();
  const { selectedPatient, hasPatients } = useHealthData();
  const [params, setParams] = useSearchParams();
  const activeTab = params.get("tab") ?? "overview";
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [appointments, setAppointments] = useState<CareAppointment[]>([]);
  const [messages, setMessages] = useState<CareMessage[]>([]);
  const [tasks, setTasks] = useState<CareTask[]>([]);
  const [documents, setDocuments] = useState<ClinicalDocument[]>([]);
  const [consents, setConsents] = useState<ConsentRecord[]>([]);
  const [outcomes, setOutcomes] = useState<Array<Record<string, unknown>>>([]);
  const [investigations, setInvestigations] = useState<Array<Record<string, unknown>>>([]);
  const [assessments, setAssessments] = useState<Array<Record<string, unknown>>>([]);
  const [schedules, setSchedules] = useState<Array<Record<string, unknown>>>([]);
  const [alerts, setAlerts] = useState<Array<Record<string, unknown>>>([]);
  const [medicationSafety, setMedicationSafety] = useState<Record<string, unknown>>({});
  const [medications, setMedications] = useState<Array<Record<string, unknown>>>([]);
  const [administrations, setAdministrations] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [appointmentForm, setAppointmentForm] = useState({
    starts_at: "",
    appointment_type: "Review",
    reason: "",
  });
  const [messageForm, setMessageForm] = useState({
    recipient_user_id: "",
    subject: "",
    body: "",
  });
  const [taskForm, setTaskForm] = useState({
    assigned_to_user_id: "",
    title: "",
    priority: "medium",
    due_at: "",
  });
  const [documentForm, setDocumentForm] = useState({
    document_type: "SOAP Note",
    title: "",
    subjective: "",
    objective: "",
    assessment: "",
    plan: "",
    terminology_system: "",
    terminology_code: "",
    patient_visible: false,
  });
  const [outcomeForm, setOutcomeForm] = useState({
    outcome_type: "symptom diary",
    severity: "5",
    response: "",
  });
  const [clinicalForm, setClinicalForm] = useState({
    investigation_type: "",
    code: "",
    assessment_type: "NEWS2",
    score: "0",
    findings: "",
    metric: "Blood pressure",
    frequency_minutes: "240",
    next_due_at: "",
    assigned_to_user_id: "",
    medication_id: "",
    medication_status: "administered",
    medication_reason: "",
    medication_scheduled_at: "",
  });

  const patientId = selectedPatient.id;
  const otherTeam = useMemo(
    () => team.filter((member) => member.id !== user?.id),
    [team, user?.id]
  );

  async function load() {
    if (!hasPatients) return;
    setLoading(true);
    setError("");
    try {
      const results = await Promise.all([
        getCareTeam(patientId),
        getAppointments(patientId),
        getCareMessages(patientId),
        getCareTasks(patientId),
        getClinicalDocuments(patientId),
        getConsents(patientId),
        getPatientOutcomes(patientId),
        getInvestigations(patientId),
        getNursingAssessments(patientId),
        getObservationSchedules(patientId),
        getAlertWorkflows(patientId),
        getMedicationSafety(patientId),
        getMedications(patientId),
        getMedicationAdministrations(patientId),
      ]);
      setTeam(results[0]);
      setAppointments(results[1]);
      setMessages(results[2]);
      setTasks(results[3]);
      setDocuments(results[4]);
      setConsents(results[5]);
      setOutcomes(results[6]);
      setInvestigations(results[7]);
      setAssessments(results[8]);
      setSchedules(results[9]);
      setAlerts(results[10]);
      setMedicationSafety(results[11]);
      setMedications(results[12]);
      setAdministrations(results[13]);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load the care workspace.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [patientId, hasPatients]);

  async function perform(action: () => Promise<unknown>, success: string) {
    setError("");
    try {
      await action();
      setNotice(success);
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "The action could not be completed.");
    }
  }

  async function downloadRecord() {
    try {
      const record = await exportPatientRecord(patientId);
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(record, null, 2)], { type: "application/json" })
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `health-record-${patientId}-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setNotice("Personal health record downloaded.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Export failed.");
    }
  }

  if (!hasPatients) {
    return (
      <div className="dashboard-shell">
        <Panel title="Care workspace" icon={HeartHandshake}>
          <p className="text-sm text-slate-500">No patient record is assigned to this account.</p>
        </Panel>
      </div>
    );
  }

  return (
    <div className="dashboard-shell space-y-6">
      <section className="glass-card rounded-3xl p-5 sm:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-blue-600">
              {isPatient ? "My care" : "Assigned caseload"}
            </p>
            <h1 className="mt-2 text-3xl font-black">Care workspace</h1>
            <p className="mt-2 text-sm text-slate-500">
              Appointments, secure messages, tasks, signed records, consent, and outcomes.
            </p>
          </div>
          {!isPatient && <div className="w-full max-w-md"><PatientSwitcher /></div>}
        </div>
        <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
          {tabs.map(([value, label]) => (
            <button
              key={value}
              onClick={() => setParams({ tab: value })}
              className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-bold ${
                activeTab === value
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {notice && <div className="rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">{notice}</div>}
      {error && <div role="alert" className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}
      {loading ? (
        <div className="flex min-h-48 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-blue-600" /></div>
      ) : (
        <>
          {activeTab === "overview" && (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {[
                [CalendarDays, "Upcoming", appointments.filter((item) => !["completed", "cancelled"].includes(item.status)).length],
                [MessageSquareText, "Messages", messages.length],
                [ClipboardList, "Open tasks", tasks.filter((item) => !["completed", "cancelled"].includes(item.status)).length],
                [FileSignature, "Signed records", documents.filter((item) => item.status === "signed").length],
              ].map(([Icon, label, count]) => {
                const MetricIcon = Icon as typeof CalendarDays;
                return (
                  <div key={String(label)} className="glass-card rounded-3xl p-6">
                    <MetricIcon className="h-7 w-7 text-blue-600" />
                    <p className="mt-5 text-sm font-bold text-slate-500">{String(label)}</p>
                    <p className="mt-1 text-3xl font-black">{String(count)}</p>
                  </div>
                );
              })}
              <div className="md:col-span-2 xl:col-span-4">
                <Panel title="Active care team" icon={Stethoscope}>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {team.map((member) => (
                      <div key={member.id} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                        <p className="font-bold">{member.full_name}</p>
                        <p className="text-sm capitalize text-slate-500">{member.role}</p>
                        <p className="mt-1 text-xs text-slate-500">{member.email}</p>
                      </div>
                    ))}
                  </div>
                </Panel>
              </div>
            </div>
          )}

          {activeTab === "appointments" && (
            <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
              <Panel title={isPatient ? "Request appointment" : "Schedule appointment"} icon={Plus}>
                <div className="space-y-3">
                  <input id="appointment-starts-at" name="appointment_starts_at" aria-label="Appointment date and time" type="datetime-local" className={inputClass} value={appointmentForm.starts_at} onChange={(event) => setAppointmentForm({ ...appointmentForm, starts_at: event.target.value })} />
                  <input id="appointment-type" name="appointment_type" aria-label="Appointment type" className={inputClass} value={appointmentForm.appointment_type} onChange={(event) => setAppointmentForm({ ...appointmentForm, appointment_type: event.target.value })} placeholder="Appointment type" />
                  <textarea id="appointment-reason" name="appointment_reason" aria-label="Appointment reason" className={textareaClass} value={appointmentForm.reason} onChange={(event) => setAppointmentForm({ ...appointmentForm, reason: event.target.value })} placeholder="Reason" />
                  <button className={primaryButton} onClick={() => perform(() => createAppointment({ patient_id: patientId, ...appointmentForm }), "Appointment saved.")}>
                    <CalendarDays className="h-4 w-4" /> {isPatient ? "Request" : "Schedule"}
                  </button>
                </div>
              </Panel>
              <Panel title="Appointment timeline" icon={CalendarDays}>
                <div className="space-y-3">
                  {appointments.map((item) => (
                    <article key={item.id} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div><p className="font-bold">{item.appointment_type}</p><p className="text-sm text-slate-500">{new Date(item.starts_at).toLocaleString()} · {item.duration_minutes} minutes</p></div>
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold capitalize text-blue-700">{item.status.replaceAll("_", " ")}</span>
                      </div>
                      {item.reason && <p className="mt-3 text-sm">{item.reason}</p>}
                      {!["completed", "cancelled"].includes(item.status) && (
                        <div className="mt-3 flex gap-2">
                          {isPatient ? (
                            <>
                              <button className="text-xs font-bold text-amber-700" onClick={() => perform(() => updateAppointment(item.id, { status: "reschedule_requested" }), "Reschedule requested.")}>Request reschedule</button>
                              <button className="text-xs font-bold text-red-700" onClick={() => perform(() => updateAppointment(item.id, { status: "cancelled", cancellation_reason: "Cancelled by patient" }), "Appointment cancelled.")}>Cancel</button>
                            </>
                          ) : (
                            <button className="text-xs font-bold text-emerald-700" onClick={() => perform(() => updateAppointment(item.id, { status: "completed" }), "Appointment completed.")}>Mark completed</button>
                          )}
                        </div>
                      )}
                    </article>
                  ))}
                  {!appointments.length && <p className="text-sm text-slate-500">No appointments recorded.</p>}
                </div>
              </Panel>
            </div>
          )}

          {activeTab === "messages" && (
            <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
              <Panel title="New secure message" icon={MessageSquareText}>
                <div className="space-y-3">
                  <select id="message-recipient" name="message_recipient" aria-label="Message recipient" className={inputClass} value={messageForm.recipient_user_id} onChange={(event) => setMessageForm({ ...messageForm, recipient_user_id: event.target.value })}>
                    <option value="">Select recipient</option>
                    {otherTeam.map((member) => <option key={member.id} value={member.id}>{member.full_name} · {member.role}</option>)}
                  </select>
                  <input id="message-subject" name="message_subject" aria-label="Message subject" className={inputClass} value={messageForm.subject} onChange={(event) => setMessageForm({ ...messageForm, subject: event.target.value })} placeholder="Subject" />
                  <textarea id="message-body" name="message_body" aria-label="Message body" className={textareaClass} value={messageForm.body} onChange={(event) => setMessageForm({ ...messageForm, body: event.target.value })} placeholder="Message" />
                  <button disabled={!messageForm.recipient_user_id || !messageForm.subject || !messageForm.body} className={primaryButton} onClick={() => perform(() => sendCareMessage({ patient_id: patientId, ...messageForm, recipient_user_id: Number(messageForm.recipient_user_id) }), "Secure message sent.")}>
                    <MessageSquareText className="h-4 w-4" /> Send securely
                  </button>
                </div>
              </Panel>
              <Panel title="Conversation history" icon={MessageSquareText}>
                <div className="space-y-3">
                  {messages.map((item) => (
                    <article key={item.id} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                      <div className="flex justify-between gap-3"><p className="font-bold">{item.subject}</p><time className="text-xs text-slate-500">{new Date(item.created_at).toLocaleString()}</time></div>
                      <p className="mt-2 text-sm leading-6">{item.body}</p>
                    </article>
                  ))}
                  {!messages.length && <p className="text-sm text-slate-500">No messages yet.</p>}
                </div>
              </Panel>
            </div>
          )}

          {activeTab === "tasks" && (
            <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
              {(isDoctor || isNurse) && (
                <Panel title="Assign care task" icon={ClipboardList}>
                  <div className="space-y-3">
                    <select id="task-assignee" name="task_assignee" aria-label="Task assignee" className={inputClass} value={taskForm.assigned_to_user_id} onChange={(event) => setTaskForm({ ...taskForm, assigned_to_user_id: event.target.value })}>
                      <option value="">Select assignee</option>
                      {team.map((member) => <option key={member.id} value={member.id}>{member.full_name} · {member.role}</option>)}
                    </select>
                    <input id="task-title" name="task_title" aria-label="Task title" className={inputClass} value={taskForm.title} onChange={(event) => setTaskForm({ ...taskForm, title: event.target.value })} placeholder="Task title" />
                    <select id="task-priority" name="task_priority" aria-label="Task priority" className={inputClass} value={taskForm.priority} onChange={(event) => setTaskForm({ ...taskForm, priority: event.target.value })}><option>low</option><option>medium</option><option>high</option><option>critical</option></select>
                    <input id="task-due-at" name="task_due_at" aria-label="Task due date and time" type="datetime-local" className={inputClass} value={taskForm.due_at} onChange={(event) => setTaskForm({ ...taskForm, due_at: event.target.value })} />
                    <button disabled={!taskForm.assigned_to_user_id || !taskForm.title} className={primaryButton} onClick={() => perform(() => createCareTask({ patient_id: patientId, ...taskForm, assigned_to_user_id: Number(taskForm.assigned_to_user_id), due_at: taskForm.due_at || null }), "Task assigned.")}><Plus className="h-4 w-4" /> Assign task</button>
                  </div>
                </Panel>
              )}
              <Panel title="Task worklist" icon={ClipboardList}>
                <div className="space-y-3">
                  {tasks.map((item) => (
                    <article key={item.id} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                      <div className="flex flex-wrap justify-between gap-3"><div><p className="font-bold">{item.title}</p><p className="text-xs capitalize text-slate-500">{item.priority} priority · {item.category}</p></div><span className="text-xs font-bold capitalize">{item.status.replaceAll("_", " ")}</span></div>
                      {item.due_at && <p className="mt-2 text-xs text-slate-500">Due {new Date(item.due_at).toLocaleString()}</p>}
                      {item.status !== "completed" && <button className="mt-3 flex items-center gap-1 text-xs font-bold text-emerald-700" onClick={() => perform(() => updateCareTask(item.id, { status: "completed", completion_note: "Completed in care workspace" }), "Task completed.")}><CheckCircle2 className="h-4 w-4" /> Complete</button>}
                    </article>
                  ))}
                  {!tasks.length && <p className="text-sm text-slate-500">No tasks assigned.</p>}
                </div>
              </Panel>
            </div>
          )}

          {activeTab === "documents" && (
            <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
              {(isDoctor || isNurse) && (
                <Panel title="Structured clinical document" icon={FileSignature}>
                  <div className="space-y-3">
                    <select name="document_type" aria-label="Document type" className={inputClass} value={documentForm.document_type} onChange={(event) => setDocumentForm({ ...documentForm, document_type: event.target.value })}><option>SOAP Note</option><option>Diagnosis</option><option>Care Plan</option><option>Report</option><option>Handover</option></select>
                    <input name="document_title" aria-label="Document title" className={inputClass} value={documentForm.title} onChange={(event) => setDocumentForm({ ...documentForm, title: event.target.value })} placeholder="Title" />
                    {(["subjective", "objective", "assessment", "plan"] as const).map((field) => <textarea key={field} name={`document_${field}`} aria-label={`Document ${field}`} className={textareaClass} value={documentForm[field]} onChange={(event) => setDocumentForm({ ...documentForm, [field]: event.target.value })} placeholder={field[0].toUpperCase() + field.slice(1)} />)}
                    <div className="grid grid-cols-2 gap-2"><select name="terminology_system" aria-label="Terminology system" className={inputClass} value={documentForm.terminology_system} onChange={(event) => setDocumentForm({ ...documentForm, terminology_system: event.target.value })}><option value="">Terminology</option><option>SNOMED CT</option><option>ICD-10</option><option>LOINC</option><option>dm+d</option></select><input name="terminology_code" aria-label="Terminology code" className={inputClass} value={documentForm.terminology_code} onChange={(event) => setDocumentForm({ ...documentForm, terminology_code: event.target.value })} placeholder="Code" /></div>
                    <label className="flex items-center gap-2 text-sm"><input name="patient_visible" aria-label="Share after doctor signs" type="checkbox" checked={documentForm.patient_visible} onChange={(event) => setDocumentForm({ ...documentForm, patient_visible: event.target.checked })} /> Share after doctor signs</label>
                    <button disabled={!documentForm.title} className={primaryButton} onClick={() => perform(() => createClinicalDocument({ patient_id: patientId, ...documentForm, terminology_system: documentForm.terminology_system || null, terminology_code: documentForm.terminology_code || null }), "Draft clinical document saved.")}><FileSignature className="h-4 w-4" /> Save versioned draft</button>
                  </div>
                </Panel>
              )}
              <Panel title={isPatient ? "Signed reports and care records" : "Document register"} icon={FileSignature}>
                <div className="space-y-3">
                  {documents.map((item) => (
                    <article key={item.id} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                      <div className="flex flex-wrap justify-between gap-3"><div><p className="font-bold">{item.title}</p><p className="text-xs text-slate-500">{item.document_type} · version {item.version}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold capitalize dark:bg-slate-900">{item.status}</span></div>
                      {item.assessment && <p className="mt-3 text-sm"><strong>Assessment:</strong> {item.assessment}</p>}
                      {item.plan && <p className="mt-2 text-sm"><strong>Plan:</strong> {item.plan}</p>}
                      {item.terminology_code && <code className="mt-3 inline-block rounded bg-blue-50 px-2 py-1 text-xs text-blue-800">{item.terminology_system}: {item.terminology_code}</code>}
                      {isDoctor && item.status === "draft" && <button className="mt-3 block text-xs font-bold text-blue-700" onClick={() => perform(() => signClinicalDocument(item.id), "Document signed and locked.")}>Sign document</button>}
                    </article>
                  ))}
                  {!documents.length && <p className="text-sm text-slate-500">{isPatient ? "No signed reports have been shared yet." : "No clinical documents yet."}</p>}
                </div>
              </Panel>
            </div>
          )}

          {activeTab === "clinical" && (
            <div className="space-y-6">
              <div className="grid gap-6 xl:grid-cols-2">
                <Panel title="Investigations and results" icon={Stethoscope}>
                  {isDoctor && (
                    <div className="mb-5 grid gap-3 rounded-2xl bg-slate-50 p-4 dark:bg-slate-900 md:grid-cols-2">
                      <input name="investigation_type" aria-label="Investigation type" className={inputClass} value={clinicalForm.investigation_type} onChange={(event) => setClinicalForm({ ...clinicalForm, investigation_type: event.target.value })} placeholder="Investigation e.g. Full blood count" />
                      <input name="investigation_code" aria-label="Investigation code" className={inputClass} value={clinicalForm.code} onChange={(event) => setClinicalForm({ ...clinicalForm, code: event.target.value })} placeholder="LOINC code (optional)" />
                      <button disabled={!clinicalForm.investigation_type} className={primaryButton} onClick={() => perform(() => orderInvestigation({ patient_id: patientId, investigation_type: clinicalForm.investigation_type, code: clinicalForm.code || null, code_system: clinicalForm.code ? "LOINC" : null, priority: "routine" }), "Investigation ordered.")}><Plus className="h-4 w-4" /> Order investigation</button>
                    </div>
                  )}
                  <div className="space-y-3">
                    {investigations.map((item) => <article key={String(item.id)} className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-800"><div className="flex justify-between gap-3"><strong>{String(item.investigation_type)}</strong><span className="capitalize">{String(item.status)}</span></div>{item.result ? <p className="mt-2">{String(item.result)}</p> : <p className="mt-2 text-slate-500">Result pending</p>}{Boolean(item.code) && <code className="mt-2 block text-xs">{String(item.code_system)}: {String(item.code)}</code>}</article>)}
                    {!investigations.length && <p className="text-sm text-slate-500">No investigations recorded.</p>}
                  </div>
                </Panel>

                <Panel title="Medication safety review" icon={ShieldCheck}>
                  <div className={`rounded-2xl p-4 text-sm ${medicationSafety.status === "review_required" ? "bg-red-50 text-red-900" : "bg-emerald-50 text-emerald-900"}`}>
                    <p className="font-extrabold capitalize">{String(medicationSafety.status ?? "not checked").replaceAll("_", " ")}</p>
                    <p className="mt-2 leading-6">{String(medicationSafety.warning ?? "")}</p>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800"><p className="text-xs font-bold uppercase text-slate-500">Duplicates</p><p className="mt-2 text-sm">{Array.isArray(medicationSafety.duplicate_medications) && medicationSafety.duplicate_medications.length ? medicationSafety.duplicate_medications.join(", ") : "None detected locally"}</p></div>
                    <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800"><p className="text-xs font-bold uppercase text-slate-500">Allergy matches</p><p className="mt-2 text-sm">{Array.isArray(medicationSafety.allergy_matches) && medicationSafety.allergy_matches.length ? medicationSafety.allergy_matches.join(", ") : "None detected locally"}</p></div>
                  </div>
                </Panel>

                <Panel title="Medication administration record" icon={ClipboardList}>
                  {isNurse && (
                    <div className="mb-5 space-y-3 rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
                      <select name="medication_id" aria-label="Medication" className={inputClass} value={clinicalForm.medication_id} onChange={(event) => setClinicalForm({ ...clinicalForm, medication_id: event.target.value })}><option value="">Select medication</option>{medications.map((item) => <option key={String(item.id)} value={String(item.id)}>{String(item.name)} · {String(item.dosage)}</option>)}</select>
                      <input name="medication_scheduled_at" aria-label="Scheduled medication time" type="datetime-local" className={inputClass} value={clinicalForm.medication_scheduled_at} onChange={(event) => setClinicalForm({ ...clinicalForm, medication_scheduled_at: event.target.value })} />
                      <select name="medication_status" aria-label="Medication administration status" className={inputClass} value={clinicalForm.medication_status} onChange={(event) => setClinicalForm({ ...clinicalForm, medication_status: event.target.value })}><option>administered</option><option>missed</option><option>refused</option><option>delayed</option><option>unavailable</option></select>
                      {clinicalForm.medication_status !== "administered" && <textarea name="medication_reason" aria-label="Medication exception reason" className={textareaClass} value={clinicalForm.medication_reason} onChange={(event) => setClinicalForm({ ...clinicalForm, medication_reason: event.target.value })} placeholder="Mandatory exception reason" />}
                      <button disabled={!clinicalForm.medication_id || !clinicalForm.medication_scheduled_at || (clinicalForm.medication_status !== "administered" && !clinicalForm.medication_reason)} className={primaryButton} onClick={() => perform(() => recordMedicationAdministration({ patient_id: patientId, medication_id: Number(clinicalForm.medication_id), scheduled_at: clinicalForm.medication_scheduled_at, status: clinicalForm.medication_status, reason: clinicalForm.medication_reason || null }), "Medication administration recorded.")}>Record administration</button>
                    </div>
                  )}
                  <div className="space-y-2">{administrations.map((item) => <div key={String(item.id)} className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-800"><div className="flex justify-between"><strong className="capitalize">{String(item.status)}</strong><span>{new Date(String(item.scheduled_at)).toLocaleString()}</span></div>{Boolean(item.reason) && <p className="mt-1 text-red-700">{String(item.reason)}</p>}</div>)}{!administrations.length && <p className="text-sm text-slate-500">No administration records.</p>}</div>
                </Panel>
              </div>

              <div className="grid gap-6 xl:grid-cols-2">
                <Panel title="Observation schedules" icon={CalendarDays}>
                  {(isDoctor || isNurse) && (
                    <div className="mb-5 grid gap-3 rounded-2xl bg-slate-50 p-4 dark:bg-slate-900 md:grid-cols-2">
                      <input name="observation_metric" aria-label="Observation type" className={inputClass} value={clinicalForm.metric} onChange={(event) => setClinicalForm({ ...clinicalForm, metric: event.target.value })} placeholder="Observation" />
                      <select name="observation_assignee" aria-label="Assigned clinician" className={inputClass} value={clinicalForm.assigned_to_user_id} onChange={(event) => setClinicalForm({ ...clinicalForm, assigned_to_user_id: event.target.value })}><option value="">Assigned clinician</option>{team.filter((member) => member.role === "nurse" || member.role === "doctor").map((member) => <option key={member.id} value={member.id}>{member.full_name}</option>)}</select>
                      <input name="observation_frequency_minutes" aria-label="Observation frequency in minutes" type="number" className={inputClass} value={clinicalForm.frequency_minutes} onChange={(event) => setClinicalForm({ ...clinicalForm, frequency_minutes: event.target.value })} placeholder="Frequency minutes" />
                      <input name="observation_next_due_at" aria-label="Next observation due date and time" type="datetime-local" className={inputClass} value={clinicalForm.next_due_at} onChange={(event) => setClinicalForm({ ...clinicalForm, next_due_at: event.target.value })} />
                      <button disabled={!clinicalForm.assigned_to_user_id || !clinicalForm.next_due_at} className={primaryButton} onClick={() => perform(() => createObservationSchedule({ patient_id: patientId, assigned_to_user_id: Number(clinicalForm.assigned_to_user_id), metric: clinicalForm.metric, frequency_minutes: Number(clinicalForm.frequency_minutes), next_due_at: clinicalForm.next_due_at, escalation_minutes: 30 }), "Observation schedule created.")}>Schedule observations</button>
                    </div>
                  )}
                  <div className="space-y-2">{schedules.map((item) => <div key={String(item.id)} className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-800"><strong>{String(item.metric)}</strong><p className="mt-1 text-slate-500">Every {String(item.frequency_minutes)} minutes · next due {new Date(String(item.next_due_at)).toLocaleString()}</p></div>)}{!schedules.length && <p className="text-sm text-slate-500">No observation schedules.</p>}</div>
                </Panel>

                <Panel title="Nursing assessments" icon={ClipboardList}>
                  {isNurse && (
                    <div className="mb-5 space-y-3 rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
                      <select name="assessment_type" aria-label="Assessment type" className={inputClass} value={clinicalForm.assessment_type} onChange={(event) => setClinicalForm({ ...clinicalForm, assessment_type: event.target.value })}><option>NEWS2</option><option>pain</option><option>falls</option><option>mobility</option><option>wound</option><option>fluid balance</option><option>general</option></select>
                      <input name="assessment_score" aria-label="Assessment score" type="number" className={inputClass} value={clinicalForm.score} onChange={(event) => setClinicalForm({ ...clinicalForm, score: event.target.value })} placeholder="Score" />
                      <textarea name="assessment_findings" aria-label="Assessment findings" className={textareaClass} value={clinicalForm.findings} onChange={(event) => setClinicalForm({ ...clinicalForm, findings: event.target.value })} placeholder="Structured findings summary" />
                      <button disabled={!clinicalForm.findings} className={primaryButton} onClick={() => perform(() => createNursingAssessment({ patient_id: patientId, assessment_type: clinicalForm.assessment_type, score: Number(clinicalForm.score), findings: { summary: clinicalForm.findings }, escalation_required: Number(clinicalForm.score) >= 5 }), "Nursing assessment saved.")}>Save assessment</button>
                    </div>
                  )}
                  <div className="space-y-2">{assessments.map((item) => <div key={String(item.id)} className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-800"><div className="flex justify-between"><strong>{String(item.assessment_type)}</strong><span>Score {String(item.score ?? "—")}</span></div><p className="mt-1 text-slate-500">{JSON.stringify(item.findings)}</p></div>)}{!assessments.length && <p className="text-sm text-slate-500">No structured assessments.</p>}</div>
                </Panel>
              </div>

              <Panel title="Alert ownership and escalation" icon={RefreshCw}>
                <div className="space-y-3">
                  {alerts.map((item) => <article key={String(item.id)} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800"><div className="flex flex-wrap justify-between gap-3"><div><strong>{String(item.patient_name)} · {String(item.risk_level)}</strong><p className="mt-1 text-sm text-slate-500">{String(item.note ?? "")}</p></div><span className="capitalize">{String(item.status)}</span></div>{(isDoctor || isNurse) && item.status !== "Resolved" && <div className="mt-3 flex gap-3"><button className="text-xs font-bold text-blue-700" onClick={() => perform(() => updateAlertWorkflow(Number(item.id), { action: "acknowledge", owner_user_id: user?.id }), "Alert acknowledged and owned.")}>Acknowledge & own</button><button className="text-xs font-bold text-emerald-700" onClick={() => perform(() => updateAlertWorkflow(Number(item.id), { action: "resolve", resolution_reason: "Reviewed and action completed" }), "Alert resolved with reason.")}>Resolve</button></div>}</article>)}
                  {!alerts.length && <p className="text-sm text-slate-500">No alerts for this patient.</p>}
                </div>
              </Panel>
            </div>
          )}

          {activeTab === "privacy" && (
            <div className="grid gap-6 xl:grid-cols-2">
              <Panel title="Consent and privacy" icon={ShieldCheck}>
                {isPatient ? (
                  <div className="space-y-3">
                    {["care_team_access", "device_sync", "ai_processing", "research", "communications"].map((type) => {
                      const latest = consents.find((item) => item.consent_type === type);
                      return (
                        <div key={type} className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                          <span className="text-sm font-bold capitalize">{type.replaceAll("_", " ")}</span>
                          <button className={`rounded-lg px-3 py-2 text-xs font-bold ${latest?.granted ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`} onClick={() => perform(() => recordConsent({ patient_id: patientId, consent_type: type, granted: !latest?.granted, policy_version: "2026-07" }), "Consent preference recorded.")}>{latest?.granted ? "Granted" : "Not granted"}</button>
                        </div>
                      );
                    })}
                    <button className={primaryButton} onClick={() => perform(() => createDataRequest({ patient_id: patientId, request_type: "export", details: "Please provide a copy of my complete record." }), "Data export request submitted.")}>Request complete data export</button>
                    <button className="h-11 rounded-xl border border-blue-300 px-4 text-sm font-bold text-blue-700" onClick={downloadRecord}>Download current record now</button>
                    <button className="h-11 rounded-xl border border-slate-300 px-4 text-sm font-bold" onClick={() => perform(() => createDataRequest({ patient_id: patientId, request_type: "correction", details: "I would like to dispute or correct information in my record." }), "Correction request submitted.")}>Dispute inaccurate data</button>
                  </div>
                ) : (
                  <div className="space-y-2">{consents.map((item) => <div key={item.id} className="flex justify-between rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-800"><span className="capitalize">{item.consent_type.replaceAll("_", " ")}</span><strong>{item.granted ? "Granted" : "Withdrawn"}</strong></div>)}</div>
                )}
              </Panel>
              <Panel title={isPatient ? "Symptom diary and outcomes" : "Patient-reported outcomes"} icon={RefreshCw}>
                {isPatient && (
                  <div className="mb-5 space-y-3">
                    <select name="outcome_type" aria-label="Patient outcome type" className={inputClass} value={outcomeForm.outcome_type} onChange={(event) => setOutcomeForm({ ...outcomeForm, outcome_type: event.target.value })}><option>symptom diary</option><option>questionnaire</option><option>side effect</option><option>pain score</option><option>wellbeing</option></select>
                    <input name="outcome_severity" aria-label="Symptom severity" type="range" min="0" max="10" value={outcomeForm.severity} onChange={(event) => setOutcomeForm({ ...outcomeForm, severity: event.target.value })} className="w-full" />
                    <p className="text-xs text-slate-500">Severity {outcomeForm.severity}/10</p>
                    <textarea name="outcome_response" aria-label="Symptoms, side effects, or wellbeing" className={textareaClass} value={outcomeForm.response} onChange={(event) => setOutcomeForm({ ...outcomeForm, response: event.target.value })} placeholder="Describe symptoms, side effects, or wellbeing" />
                    <button disabled={!outcomeForm.response} className={primaryButton} onClick={() => perform(() => createPatientOutcome({ patient_id: patientId, ...outcomeForm, severity: Number(outcomeForm.severity) }), "Outcome shared with your care team.")}>Submit outcome</button>
                  </div>
                )}
                <div className="space-y-2">
                  {outcomes.map((item) => <div key={String(item.id)} className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-800"><strong className="capitalize">{String(item.outcome_type)}</strong><p className="mt-1">{String(item.response)}</p><p className="mt-1 text-xs text-slate-500">Severity {String(item.severity ?? "not scored")}/10</p></div>)}
                  {!outcomes.length && <p className="text-sm text-slate-500">No patient-reported outcomes.</p>}
                </div>
              </Panel>
            </div>
          )}
        </>
      )}
    </div>
  );
}
