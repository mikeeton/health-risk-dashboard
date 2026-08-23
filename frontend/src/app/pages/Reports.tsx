import { useEffect, useMemo, useState } from "react";
import {
  BrainCircuit,
  FileText,
  Loader2,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import AITextBox from "../components/AITextBox";

import { useHealthData } from "../context/HealthDataContext";
import ClinicianPdfReportButton from "../components/ClinicianPdfReportButton";
import { getAIPatientSummary, getMLPrediction } from "../services/api";

type Prediction = {
  prediction_score: number;
  prediction_level: string;
  probability?: number;
  source?: string;
  message: string;
};

export default function Reports() {
  const { selectedPatient, healthData } = useHealthData();

  const [aiSummary, setAiSummary] = useState("");
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [loading, setLoading] = useState(false);

  const patientData = useMemo(() => {
    return healthData.filter(
      (record) => record.patientId === selectedPatient.id
    );
  }, [healthData, selectedPatient.id]);

  const latest = patientData[patientData.length - 1];

  async function loadReportPreview() {
    try {
      setLoading(true);

      const [aiResult, predictionResult] = await Promise.allSettled([
        getAIPatientSummary(selectedPatient.id),
        getMLPrediction(selectedPatient.id),
      ]);

      setAiSummary(
        aiResult.status === "fulfilled"
          ? aiResult.value.summary ?? "AI summary unavailable."
          : "AI summary unavailable."
      );

      setPrediction(
        predictionResult.status === "fulfilled"
          ? predictionResult.value
          : null
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReportPreview();
  }, [selectedPatient.id]);

  return (
    <div className="dashboard-shell space-y-8">
      <section className="glass-card rounded-3xl p-6 sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300">
              <FileText className="h-7 w-7" />
            </div>

            <div>
              <h1 className="text-3xl font-bold text-slate-950 dark:text-white">
                Reports & Export
              </h1>
              <p className="mt-1 text-slate-500 dark:text-slate-400">
                Review the current risk picture and export a clinician-ready PDF.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={loadReportPreview}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <BrainCircuit className="h-4 w-4" />
              )}
              Refresh Summary
            </button>

            <ClinicianPdfReportButton
              patient={selectedPatient}
              vitals={patientData}
            />
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="glass-card rounded-3xl p-6">
          <UserRound className="mb-4 h-7 w-7 text-blue-600" />
          <p className="text-sm font-bold text-slate-500">Patient</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">
            {selectedPatient.name}
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            {selectedPatient.age} years old
          </p>
        </div>

        <div className="glass-card rounded-3xl p-6">
          <ShieldCheck className="mb-4 h-7 w-7 text-blue-600" />
          <p className="text-sm font-bold text-slate-500">Clinical Risk</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">
            {selectedPatient.riskLevel}
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            {selectedPatient.condition}
          </p>
        </div>

        <div className="glass-card rounded-3xl p-6">
          <BrainCircuit className="mb-4 h-7 w-7 text-blue-600" />
          <p className="text-sm font-bold text-slate-500">Trained Six-Hour ML Prediction</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">
            {prediction ? `${prediction.prediction_score}/10` : "Unavailable"}
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            {prediction
              ? prediction.source === "versioned_model" && prediction.probability !== undefined
                ? `${prediction.prediction_level} · ${(prediction.probability * 100).toFixed(1)}% predicted six-hour event probability`
                : `${prediction.prediction_level} · ${prediction.source === "deterministic_safety_override" ? "Safety Rules" : "calculated fallback (no model probability)"}`
              : "Prediction unavailable"}
          </p>
        </div>

      </section>

      <section className="glass-card rounded-3xl p-6">
        <div className="mb-5 flex flex-col gap-3 border-b border-slate-200 pb-5 dark:border-slate-800 md:flex-row md:items-center md:justify-between">
          <h2 className="mb-4 text-xl font-extrabold text-slate-950 dark:text-white">
            Clinician Summary
          </h2>

          <p className="text-sm text-slate-500">
            {latest
              ? `Latest: HR ${latest.heartRate} bpm, SpO2 ${latest.spo2}%, BP ${latest.systolicBP}/${latest.diastolicBP}, risk ${latest.riskScore}/10`
              : "No recent vitals available"}
          </p>
        </div>

          {loading ? (
            <div className="space-y-3">
              <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-4 w-full animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
            </div>
          ) : (
            <AITextBox
  title="Groq AI Assistant Summary"
  text={aiSummary || "No AI summary available."}
  modelUsed="llama-3.1-8b-instant"
/>
          )}
      </section>
    </div>
  );
}
