import { useEffect, useState } from "react";
import { BrainCircuit } from "lucide-react";
import { getMLPrediction } from "../services/api";

type MLPrediction = {
  patient_id: number;
  prediction_score: number;
  prediction_level: string;
  confidence: number;
  message: string;
  source?: string;
  model_version?: string;
  anomaly_detected?: boolean;
  anomaly_score?: number;
  explanations?: Array<{ feature: string; value: number; contribution: number; method: string }>;
};

type Props = {
  patientId: number;
};

export default function MLPredictionPanel({ patientId }: Props) {
  const [prediction, setPrediction] = useState<MLPrediction | null>(null);
  const [error, setError] = useState("");

  const loadPrediction = async () => {
    try {
      setError("");
      const data = await getMLPrediction(patientId);
      setPrediction(data);
    } catch {
      setPrediction(null);
      setError("At least 5 vital records are needed for ML prediction.");
    }
  };

  useEffect(() => {
    loadPrediction();
  }, [patientId]);

  return (
    <section className="glass-card rounded-3xl p-6">
      <div className="mb-5 flex items-center gap-3">
        <BrainCircuit className="h-6 w-6 text-blue-600" />

        <div>
          <h2 className="text-xl font-bold">Scikit-Learn Prediction</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Versioned prediction with deterministic safety override
          </p>
        </div>
      </div>

      {error ? (
        <p className="rounded-2xl bg-yellow-50 p-4 text-sm text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400">
          {error}
        </p>
      ) : prediction ? (
        <div>
          <p className="text-5xl font-extrabold">
            {prediction.prediction_score}/10
          </p>

          <p className="mt-2 text-sm font-bold uppercase text-slate-500">
            {prediction.prediction_level}
          </p>

          <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300">
            {prediction.message}
          </p>

          <p className="mt-3 text-xs text-slate-400">
            Confidence: {(prediction.confidence * 100).toFixed(0)}%
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Source: {prediction.source?.replaceAll("_", " ") ?? "unknown"}
            {prediction.model_version ? ` · model ${prediction.model_version}` : ""}
          </p>

          {prediction.explanations && prediction.explanations.length > 0 && (
            <div className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-800">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Leading evidence</p>
              <ul className="mt-3 space-y-2 text-sm">
                {prediction.explanations.slice(0, 5).map((item) => (
                  <li key={item.feature} className="flex justify-between gap-3">
                    <span>{item.feature.replaceAll("_", " ")}</span>
                    <span className={item.contribution >= 0 ? "text-rose-600" : "text-emerald-600"}>{item.contribution >= 0 ? "+" : ""}{item.contribution.toFixed(3)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            onClick={loadPrediction}
            className="mt-5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
          >
            Recalculate Prediction
          </button>
        </div>
      ) : (
        <p>Loading prediction...</p>
      )}
    </section>
  );
}
