import { useEffect, useMemo, useState } from "react";
import {
  BrainCircuit,
  Download,
  FileText,
  Loader2,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { useHealthData } from "../context/HealthDataContext";
import ClinicianPdfReportButton from "../components/ClinicianPdfReportButton";
import { getAIPatientSummary, getMLPrediction } from "../services/api";

type Prediction = {
  prediction_score: number;
  prediction_level: string;
  confidence: number;
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
      <section className="glass-card rounded-3xl p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/25">
              <FileText className="h-7 w-7" />
            </div>

            <div>
              <h1 className="text-3xl font-extrabold text-slate-950 dark:text-white">
                Clinical Reports
              </h1>
              <p className="mt-1 text-slate-500 dark:text-slate-400">
                Generate AI-assisted clinician reports using vitals,
                medication records, timeline events, and ML prediction.
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
              Refresh AI Preview
            </button>

            <ClinicianPdfReportButton
              patient={selectedPatient}
              vitals={patientData}
            />
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-4">
        <div className="glass-card rounded-3xl p-6">
          <UserRound className="mb-4 h-7 w-7 text-blue-600" />
          <p className="text-sm font-bold text-slate-500">Patient</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">
            {selectedPatient.name}
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            {selectedPatient.age} years old · {selectedPatient.condition}
          </p>
        </div>

        <div className="glass-card rounded-3xl p-6">
          <ShieldCheck className="mb-4 h-7 w-7 text-blue-600" />
          <p className="text-sm font-bold text-slate-500">Recorded Risk</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">
            {selectedPatient.riskLevel}
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Last checkup: {selectedPatient.lastCheckup}
          </p>
        </div>

        <div className="glass-card rounded-3xl p-6">
          <BrainCircuit className="mb-4 h-7 w-7 text-blue-600" />
          <p className="text-sm font-bold text-slate-500">ML Prediction</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">
            {prediction ? `${prediction.prediction_score}/10` : "Unavailable"}
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            {prediction
              ? `${prediction.prediction_level} · ${Math.round(
                  prediction.confidence * 100
                )}% confidence`
              : "More vitals may be required"}
          </p>
        </div>

        <div className="glass-card rounded-3xl p-6">
          <Download className="mb-4 h-7 w-7 text-blue-600" />
          <p className="text-sm font-bold text-slate-500">Latest Reading</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">
            {latest ? `Risk ${latest.riskScore}/10` : "No Data"}
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            {latest
              ? `HR ${latest.heartRate} · SpO₂ ${latest.spo2}%`
              : "No recent vitals"}
          </p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="glass-card rounded-3xl p-6">
          <h2 className="mb-4 text-xl font-extrabold text-slate-950 dark:text-white">
            Report Preview
          </h2>

          <div className="space-y-4 text-sm leading-7 text-slate-700 dark:text-slate-300">
            <p>
              <span className="font-bold">Patient:</span>{" "}
              {selectedPatient.name}
            </p>

            <p>
              <span className="font-bold">Condition:</span>{" "}
              {selectedPatient.condition}
            </p>

            <p>
              <span className="font-bold">Latest Vitals:</span>{" "}
              {latest
                ? `Heart rate ${latest.heartRate} bpm, SpO₂ ${latest.spo2}%, BP ${latest.systolicBP}/${latest.diastolicBP}, sleep ${latest.sleepHours}h, risk score ${latest.riskScore}/10.`
                : "No latest vital reading available."}
            </p>

            <p>
              <span className="font-bold">Prediction:</span>{" "}
              {prediction
                ? `${prediction.prediction_level} risk with ${Math.round(
                    prediction.confidence * 100
                  )}% confidence.`
                : "Prediction currently unavailable."}
            </p>
          </div>
        </div>

        <div className="glass-card rounded-3xl p-6">
          <h2 className="mb-4 text-xl font-extrabold text-slate-950 dark:text-white">
            AI Risk Analysis
          </h2>

          {loading ? (
            <div className="space-y-3">
              <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-4 w-full animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
            </div>
          ) : (
            <div className="max-h-[420px] overflow-y-auto whitespace-pre-wrap pr-2 text-sm leading-7 text-slate-700 dark:text-slate-300">
              {aiSummary || "No AI summary available."}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}