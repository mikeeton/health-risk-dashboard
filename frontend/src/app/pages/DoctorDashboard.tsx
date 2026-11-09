import { type FormEvent, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  FileText,
  FilePlus2,
  HeartPulse,
  Send,
  ShieldAlert,
} from "lucide-react";

import AITextBox from "../components/AITextBox";
import ObservedVitalsTrend from "../components/ObservedVitalsTrend";

import { useHealthData } from "../context/HealthDataContext";
import {
  doctorAddClinicalNote,
  doctorEscalatePatient,
  type DoctorClinicalNoteType,
  getAIPatientSummary,
  getMLPrediction,
  getReviewCases,
} from "../services/api";

type ReviewCase = {
  id: number;
  patient_id: number;
  patient_name: string;
  risk_level: string;
  risk_score: number;
  status: string;
  note: string;
};

type Prediction = {
  prediction_score: number;
  prediction_level: string;
  probability?: number;
  source?: string;
  message: string;
};

export default function DoctorDashboard() {
  const { patients, selectedPatient, healthData } = useHealthData();

  const [reviewCases, setReviewCases] = useState<ReviewCase[]>([]);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [aiSummary, setAiSummary] = useState("");
  const [aiModel, setAiModel] = useState("unavailable");
  const [aiProviderStatus, setAiProviderStatus] = useState("unavailable");
  const [noteType, setNoteType] = useState<DoctorClinicalNoteType>("Diagnosis");
  const [noteTitle, setNoteTitle] = useState("");
  const [noteDescription, setNoteDescription] = useState("");
  const [escalationNote, setEscalationNote] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [submittingAction, setSubmittingAction] = useState(false);

  const selectedVitals = useMemo(() => {
    return healthData
      .filter((record) => record.patientId === selectedPatient.id)
      .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
  }, [healthData, selectedPatient.id]);

  const latestVital = selectedVitals[selectedVitals.length - 1];

  const highRiskPatients = patients.filter((patient) =>
    ["High", "Critical"].includes(patient.riskLevel)
  );

  async function loadDashboard() {
    setPrediction(null);
    const [casesResult, predictionResult, aiResult] =
      await Promise.allSettled([
        getReviewCases(),
        getMLPrediction(selectedPatient.id),
        getAIPatientSummary(selectedPatient.id),
      ]);

    if (casesResult.status === "fulfilled") {
      setReviewCases(casesResult.value);
    }

    if (predictionResult.status === "fulfilled") {
      setPrediction(predictionResult.value);
    } else {
      setPrediction(null);
    }

    if (aiResult.status === "fulfilled") {
      setAiSummary(aiResult.value.summary ?? "");
      setAiModel(aiResult.value.model_used ?? "deterministic fallback");
      setAiProviderStatus(aiResult.value.provider_status ?? "unknown");
    } else {
      setAiSummary("");
      setAiModel("unavailable");
      setAiProviderStatus("unavailable");
    }
  }

  useEffect(() => {
    loadDashboard();
  }, [selectedPatient.id]);

  const openCases = reviewCases.filter((item) => item.status !== "Resolved");

  async function handleClinicalNoteSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittingAction(true);
    setActionMessage("");

    try {
      await doctorAddClinicalNote(
        selectedPatient.id,
        noteTitle.trim(),
        noteDescription.trim(),
        noteType
      );
      setNoteTitle("");
      setNoteDescription("");
      setActionMessage(`${noteType} saved for ${selectedPatient.name}.`);
      await loadDashboard();
    } catch {
      setActionMessage("Unable to save the clinical note. Check the fields and try again.");
    } finally {
      setSubmittingAction(false);
    }
  }

  async function handleEscalationSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittingAction(true);
    setActionMessage("");

    try {
      await doctorEscalatePatient(selectedPatient.id, escalationNote.trim());
      setEscalationNote("");
      setActionMessage(`${selectedPatient.name} has been escalated for review.`);
      await loadDashboard();
    } catch {
      setActionMessage("Unable to escalate this patient right now.");
    } finally {
      setSubmittingAction(false);
    }
  }

  return (
    <div className="dashboard-shell space-y-8">
      <section className="glass-card rounded-3xl p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-950 dark:text-white">
              Clinical command centre
            </h1>
            <p className="mt-2 text-slate-500 dark:text-slate-400">
              Review patient observations, prioritised cases, and clinical decisions.
            </p>
          </div>

          <button
            onClick={loadDashboard}
            className="w-fit rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700"
          >
            Refresh clinical data
          </button>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)]">
        <div className="glass-card rounded-3xl p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-xl font-extrabold">Review priorities</h2>
            <a href="/review-cases" className="text-sm font-semibold text-blue-700 underline dark:text-blue-300">Open case register</a>
          </div>
          <p className="mt-1 text-sm text-slate-500">{highRiskPatients.length} high or critical risk patients; {openCases.length} open review cases</p>
          <div className="mt-5 divide-y divide-slate-200 dark:divide-slate-800">
            {highRiskPatients.slice(0, 5).map((patient) => (
              <div key={patient.id} className="flex items-center justify-between gap-4 py-3">
                <div><p className="font-semibold">{patient.name}</p><p className="text-sm text-slate-500">{patient.condition}</p></div>
                <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-800 dark:bg-red-950 dark:text-red-200">{patient.riskLevel}</span>
              </div>
            ))}
            {highRiskPatients.length === 0 && <p className="py-4 text-sm text-slate-500">No assigned patients are currently marked high or critical risk.</p>}
          </div>
        </div>
        <div className="glass-card rounded-3xl p-6">
          <h2 className="text-xl font-extrabold">Selected patient assessment</h2>
          <p className="mt-1 text-sm text-slate-500">{selectedPatient.name}</p>
          <p className="mt-6 text-4xl font-black">{prediction ? `${prediction.prediction_score}/10` : "Unavailable"}</p>
          <p className="mt-2 font-semibold">{prediction?.prediction_level ?? "Prediction unavailable"}</p>
          <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">{prediction?.message ?? "No prediction returned for this patient."}</p>
          <p className="mt-4 text-xs text-slate-500">Prediction source: {prediction?.source ?? "not reported"}. Research support only; review the observations and clinical record.</p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="glass-card rounded-3xl p-6 xl:col-span-2">
          <div className="mb-5 flex items-center gap-3">
            <HeartPulse className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-extrabold">Selected Patient Overview</h2>
              <p className="text-sm text-slate-500">
                {selectedPatient.name} · {selectedPatient.condition}
              </p>
            </div>
          </div>

          {latestVital ? (
            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
                <p className="text-xs font-bold text-slate-500">Heart Rate</p>
                <p className="mt-1 text-2xl font-black">{latestVital.heartRate}</p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
                <p className="text-xs font-bold text-slate-500">SpO₂</p>
                <p className="mt-1 text-2xl font-black">{latestVital.spo2}%</p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
                <p className="text-xs font-bold text-slate-500">Blood Pressure</p>
                <p className="mt-1 text-2xl font-black">
                  {latestVital.systolicBP}/{latestVital.diastolicBP}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
                <p className="text-xs font-bold text-slate-500">Calculated risk</p>
                <p className="mt-1 text-2xl font-black">{latestVital.riskScore}/10</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">No vitals available.</p>
          )}
        </div>

        <div className="glass-card rounded-3xl p-6">
          <div className="mb-5 flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-yellow-600" />
            <div>
              <h2 className="text-xl font-extrabold">Live Alerts</h2>
              <p className="text-sm text-slate-500">Clinical attention queue</p>
            </div>
          </div>

          <div className="space-y-3">
            {openCases.slice(0, 4).map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-yellow-100 bg-yellow-50 p-4 text-sm dark:border-yellow-900/40 dark:bg-yellow-950/20"
              >
                <p className="font-bold">{item.patient_name}</p>
                <p className="text-slate-600 dark:text-slate-300">
                  Risk {item.risk_score}/10 · {item.status}
                </p>
              </div>
            ))}

            {!openCases.length && (
              <p className="text-sm text-slate-500">No open clinical alerts.</p>
            )}
          </div>
        </div>
      </section>

      <ObservedVitalsTrend records={selectedVitals} />

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="glass-card rounded-3xl p-6">
          <div className="mb-5 flex items-center gap-3">
            <FilePlus2 className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-extrabold">Diagnosis and Treatment Notes</h2>
              <p className="text-sm text-slate-500">
                Add structured clinical context for the selected patient.
              </p>
            </div>
          </div>

          <form onSubmit={handleClinicalNoteSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">
                Note Type
                <select name="clinical_note_type" aria-label="Clinical note type"
                  value={noteType}
                  onChange={(event) =>
                    setNoteType(event.target.value as DoctorClinicalNoteType)
                  }
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950"
                >
                  <option value="Diagnosis">Diagnosis</option>
                  <option value="Treatment Plan">Treatment Plan</option>
                  <option value="Clinical Note">Clinical Note</option>
                </select>
              </label>

              <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">
                Title
                <input name="clinical_note_title" aria-label="Clinical note title"
                  value={noteTitle}
                  onChange={(event) => setNoteTitle(event.target.value)}
                  minLength={3}
                  maxLength={120}
                  required
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950"
                  placeholder="e.g. Hypertension review"
                />
              </label>
            </div>

            <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">
              Clinical Details
              <textarea name="clinical_note_description" aria-label="Clinical note description"
                value={noteDescription}
                onChange={(event) => setNoteDescription(event.target.value)}
                minLength={5}
                maxLength={4000}
                required
                rows={5}
                className="mt-2 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm leading-6 dark:border-slate-800 dark:bg-slate-950"
                placeholder="Record diagnosis reasoning, care decision, or treatment instruction."
              />
            </label>

            <button
              type="submit"
              disabled={submittingAction}
              className="flex w-fit items-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              <Send className="h-4 w-4" />
              Save Note
            </button>
          </form>
        </div>

        <div className="glass-card rounded-3xl p-6">
          <div className="mb-5 flex items-center gap-3">
            <ShieldAlert className="h-6 w-6 text-red-600" />
            <div>
              <h2 className="text-xl font-extrabold">Escalate Case</h2>
              <p className="text-sm text-slate-500">
                Create a high-priority review case for this patient.
              </p>
            </div>
          </div>

          <form onSubmit={handleEscalationSubmit} className="space-y-4">
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">
              Escalation Note
              <textarea name="escalation_note" aria-label="Escalation note"
                value={escalationNote}
                onChange={(event) => setEscalationNote(event.target.value)}
                minLength={5}
                maxLength={2000}
                required
                rows={5}
                className="mt-2 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm leading-6 dark:border-slate-800 dark:bg-slate-950"
                placeholder="Explain why this case needs urgent review."
              />
            </label>

            <button
              type="submit"
              disabled={submittingAction}
              className="flex w-fit items-center gap-2 rounded-lg bg-red-600 px-4 py-3 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60"
            >
              <AlertTriangle className="h-4 w-4" />
              Escalate Patient
            </button>
          </form>

          {actionMessage && (
            <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
              {actionMessage}
            </p>
          )}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="glass-card rounded-3xl p-6">
          <div className="mb-5 flex items-center gap-3">
            <FileText className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-extrabold">Latest assistant summary</h2>
              <p className="text-sm text-slate-500">Provider and model are shown with the summary; verify against the source record.</p>
            </div>
          </div>

          <AITextBox
            title={`Latest assistant summary · ${aiProviderStatus.replaceAll("_", " ")}`}
            text={aiSummary || "No AI summary available."}
            modelUsed={aiModel}
          />
        </div>

        <div className="glass-card rounded-3xl p-6">
          <div className="mb-5 flex items-center gap-3">
            <Activity className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-extrabold">Recent Activity</h2>
              <p className="text-sm text-slate-500">Latest assigned review cases</p>
            </div>
          </div>

          <div className="space-y-3">
            {reviewCases.slice(0, 6).map((item) => (
              <div
                key={item.id}
                className="rounded-2xl bg-slate-50 p-4 text-sm dark:bg-slate-900"
              >
                <p className="font-bold">{item.status}</p>
                <p className="text-slate-500">
                  {item.patient_name} · Risk {item.risk_score}/10
                </p>
              </div>
            ))}

            {!reviewCases.length && (
              <p className="text-sm text-slate-500">No recent activity.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
