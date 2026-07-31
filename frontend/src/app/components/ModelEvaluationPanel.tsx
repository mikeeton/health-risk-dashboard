import { useEffect, useState } from "react";
import { Activity, Database, Scale, ShieldCheck } from "lucide-react";

import { getModelEvaluation, type ModelEvaluation } from "../services/api";

function percent(value: unknown) {
  return typeof value === "number" ? `${(value * 100).toFixed(1)}%` : "—";
}

export default function ModelEvaluationPanel() {
  const [evaluation, setEvaluation] = useState<ModelEvaluation | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getModelEvaluation().then(setEvaluation).catch(() => setError("Model evaluation is unavailable."));
  }, []);

  if (error) return <section className="glass-card p-6 text-sm text-rose-700">{error}</section>;
  if (!evaluation) return <section className="glass-card p-6 text-sm">Loading model evidence…</section>;
  if (!evaluation.available) {
    return (
      <section className="glass-card p-6">
        <div className="flex items-center gap-3"><Database className="h-6 w-6 text-amber-600" /><h2 className="text-xl font-bold">Model evidence</h2></div>
        <p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          {evaluation.reason} Predictions continue to use the deterministic safety and trend fallback.
        </p>
      </section>
    );
  }

  const metrics = evaluation.test_metrics ?? {};
  const cards: Array<[string, unknown]> = [
    ["ROC-AUC", metrics.roc_auc], ["Precision", metrics.precision],
    ["Sensitivity", metrics.recall_sensitivity], ["Specificity", metrics.specificity],
    ["F1 score", metrics.f1], ["PR-AUC", metrics.pr_auc],
  ];
  return (
    <section className="glass-card p-6 sm:p-7">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 dark:border-slate-800 sm:flex-row sm:items-start sm:justify-between">
        <div><div className="flex items-center gap-3"><Activity className="h-6 w-6 text-blue-600" /><h2 className="text-xl font-bold">Model performance and evidence</h2></div><p className="mt-2 text-sm text-slate-500">Version {evaluation.model_version} · {evaluation.selected_model}</p></div>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">Evaluation available</span>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3 xl:grid-cols-6">{cards.map(([label, value]) => <div key={String(label)} className="rounded-xl border border-slate-200 p-4 dark:border-slate-800"><p className="text-xs text-slate-500">{label}</p><p className="mt-2 text-xl font-bold">{percent(value)}</p></div>)}</div>
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900"><Database className="h-5 w-5 text-blue-600" /><h3 className="mt-3 font-bold">Dataset</h3><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{evaluation.dataset?.name}</p><p className="mt-1 text-xs text-slate-500">{evaluation.records?.total} records · patient-separated test set</p></div>
        <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900"><Scale className="h-5 w-5 text-blue-600" /><h3 className="mt-3 font-bold">Fairness review</h3><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Subgroup results are recorded in the versioned evaluation artifact.</p></div>
        <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900"><ShieldCheck className="h-5 w-5 text-blue-600" /><h3 className="mt-3 font-bold">Safety boundary</h3><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Critical vital thresholds bypass inference and trigger deterministic escalation.</p></div>
      </div>
      <details className="mt-5 rounded-xl border border-slate-200 p-4 dark:border-slate-800"><summary className="cursor-pointer font-semibold">Outcome and limitations</summary><p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{evaluation.outcome_definition}</p><ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-500">{evaluation.limitations?.map(item => <li key={item}>{item}</li>)}</ul></details>
    </section>
  );
}
