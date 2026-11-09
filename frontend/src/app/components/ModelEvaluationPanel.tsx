import { useEffect, useState } from "react";
import { Activity, Database, Scale, ShieldCheck } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { getModelEvaluation, getResearchCandidateEvaluation, type ModelEvaluation } from "../services/api";

function percent(value: unknown) {
  return typeof value === "number" ? `${(value * 100).toFixed(1)}%` : "—";
}

function CurvePlot({ title, points, xKey, yKey, xLabel, yLabel }: {
  title: string;
  points: Array<Record<string, number>>;
  xKey: string;
  yKey: string;
  xLabel: string;
  yLabel: string;
}) {
  const ordered = [...points].sort((a, b) => a[xKey] - b[xKey]);
  return <div className="rounded-2xl border border-[var(--panel-border)] p-5">
    <h3 className="font-bold">{title}</h3>
    <p className="mt-1 text-xs text-[var(--muted-text)]">Held-out test data; horizontal: {xLabel}, vertical: {yLabel}.</p>
    <div role="img" aria-label={`${title}; exact coordinates follow in a table`} className="mt-3 h-52">
      <ResponsiveContainer width="100%" height="100%"><LineChart data={ordered} margin={{ top: 8, right: 10, bottom: 8, left: 0 }}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey={xKey} type="number" domain={[0, 1]} tickFormatter={(v: number) => `${Math.round(v * 100)}%`} /><YAxis domain={[0, 1]} tickFormatter={(v: number) => `${Math.round(v * 100)}%`} /><Tooltip formatter={(v) => `${(Number(v) * 100).toFixed(1)}%`} /><Line dataKey={yKey} stroke="#0f766e" strokeWidth={2.5} dot={false} isAnimationActive={false} /></LineChart></ResponsiveContainer>
    </div>
    <details className="mt-2 text-xs"><summary className="cursor-pointer font-semibold">View plotted coordinates</summary><div className="mt-2 max-h-44 overflow-auto"><table className="w-full text-left"><thead><tr><th scope="col">{xLabel}</th><th scope="col">{yLabel}</th></tr></thead><tbody>{ordered.map((point, index) => <tr key={index}><td>{percent(point[xKey])}</td><td>{percent(point[yKey])}</td></tr>)}</tbody></table></div></details>
  </div>;
}

export default function ModelEvaluationPanel() {
  const [installed, setInstalled] = useState<ModelEvaluation | null>(null);
  const [candidate, setCandidate] = useState<ModelEvaluation | null>(null);
  const [selected, setSelected] = useState<"installed" | "candidate">("installed");
  const [error, setError] = useState("");

  useEffect(() => {
    getModelEvaluation().then(setInstalled).catch(() => setError("Model evaluation is unavailable."));
    getResearchCandidateEvaluation().then(setCandidate).catch(() => setCandidate(null));
  }, []);

  const evaluation = selected === "candidate" && candidate?.available ? candidate : installed;

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
  const matrix = metrics.confusion_matrix as { tn?: number; fp?: number; fn?: number; tp?: number } | undefined;
  const calibration = Array.isArray(metrics.calibration)
    ? (metrics.calibration as Array<{ predicted: number; observed: number }>).filter((point) => Number.isFinite(point.predicted) && Number.isFinite(point.observed))
    : [];
  const calibrationAxisMax = Math.min(1, Math.max(0.1, ...calibration.flatMap((point) => [point.predicted, point.observed])) * 1.1);
  const candidates = Object.entries(evaluation.candidate_validation ?? {});
  const roc = Array.isArray(metrics.roc_curve) ? metrics.roc_curve as Array<Record<string, number>> : [];
  const pr = Array.isArray(metrics.precision_recall_curve) ? metrics.precision_recall_curve as Array<Record<string, number>> : [];
  const cards: Array<[string, unknown]> = [
    ["ROC-AUC", metrics.roc_auc], ["Precision", metrics.precision],
    ["Sensitivity", metrics.recall_sensitivity], ["Specificity", metrics.specificity],
    ["F1 score", metrics.f1], ["PR-AUC", metrics.pr_auc],
  ];
  return (
    <section className="glass-card p-6 sm:p-7">
      {candidate?.available && <nav className="mb-5 flex flex-wrap gap-2" aria-label="Research model versions"><button type="button" aria-pressed={selected === "installed"} onClick={() => setSelected("installed")} className={`rounded-lg border px-3 py-2 text-sm font-semibold ${selected === "installed" ? "border-blue-600 bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-200" : "border-[var(--panel-border)]"}`}>Installed legacy model</button><button type="button" aria-pressed={selected === "candidate"} onClick={() => setSelected("candidate")} className={`rounded-lg border px-3 py-2 text-sm font-semibold ${selected === "candidate" ? "border-blue-600 bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-200" : "border-[var(--panel-border)]"}`}>Observed HR/BP candidate</button></nav>}
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 dark:border-slate-800 sm:flex-row sm:items-start sm:justify-between">
        <div><div className="flex items-center gap-3"><Activity className="h-6 w-6 text-blue-600" /><h2 className="text-xl font-bold">Model intelligence laboratory</h2></div><p className="mt-2 text-sm text-slate-500">Version {evaluation.model_version} · {evaluation.selected_model}</p></div>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">Research evidence only</span>
      </div>
      {(roc.length > 0 || pr.length > 0) && <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {roc.length > 0 && <CurvePlot title="ROC curve" points={roc} xKey="false_positive_rate" yKey="true_positive_rate" xLabel="False-positive rate" yLabel="Sensitivity" />}
        {pr.length > 0 && <CurvePlot title="Precision–recall curve" points={pr} xKey="recall" yKey="precision" xLabel="Sensitivity" yLabel="Precision" />}
      </div>}
      <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">Retrospective proxy evaluation; {evaluation.records?.test ?? "unreported"} test records; model version {evaluation.model_version}. Target preparation: {evaluation.preparation?.label_mode?.replaceAll("_", " ") ?? "legacy or unreported"}.</p>
      {selected === "candidate" && <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">This corrected-target candidate is not serving predictions. It failed its configured research inference gate; do not compare its headline metrics directly with the legacy model because the outcomes differ.</p>}
      <div className="mt-5 flex flex-wrap gap-x-7 gap-y-3 border-b border-slate-200 pb-5 dark:border-slate-800">{cards.map(([label, value]) => <div key={String(label)}><p className="text-xs text-slate-500">{label}</p><p className="text-lg font-bold">{percent(value)}</p></div>)}</div>
      {typeof metrics.false_positive_prompts_per_1000_windows === "number" && <p className="mt-4 text-sm text-amber-800 dark:text-amber-200">At the saved threshold: {metrics.false_positive_prompts_per_1000_windows.toFixed(1)} false-positive research prompts per 1,000 evaluated six-hour windows. These are retrospective model classifications, not delivered clinical alerts.</p>}
      {evaluation.test_confidence_intervals && <div className="mt-4 text-xs text-[var(--muted-text)]"><p>{evaluation.test_confidence_intervals.method} across {evaluation.test_confidence_intervals.patients} held-out patients.</p><p className="mt-1">ROC-AUC interval: {evaluation.test_confidence_intervals.metrics.roc_auc ? `${percent(evaluation.test_confidence_intervals.metrics.roc_auc.lower)}–${percent(evaluation.test_confidence_intervals.metrics.roc_auc.upper)}` : "unavailable"}.</p></div>}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
          <h3 className="font-bold">Test-set confusion matrix</h3>
          <p className="mt-1 text-xs text-slate-500">Rows: observed outcome. Columns: model prediction at threshold {typeof evaluation.operating_threshold === "number" ? `${(evaluation.operating_threshold * 100).toFixed(2)}%` : "unreported"}.</p>
          {matrix && [matrix.tn, matrix.fp, matrix.fn, matrix.tp].every((value) => typeof value === "number") ? (
            <table className="mt-4 w-full text-center text-sm"><caption className="sr-only">Test-set confusion matrix</caption><thead><tr><th scope="col" className="p-2" /><th scope="col" className="p-2">Predicted negative</th><th scope="col" className="p-2">Predicted positive</th></tr></thead><tbody><tr><th scope="row" className="p-2 text-left">Observed negative</th><td className="rounded-lg bg-teal-50 p-4 font-bold text-teal-900 dark:bg-teal-950 dark:text-teal-100">{matrix.tn}</td><td className="rounded-lg bg-amber-50 p-4 font-bold text-amber-900 dark:bg-amber-950 dark:text-amber-100">{matrix.fp}</td></tr><tr><th scope="row" className="p-2 text-left">Observed positive</th><td className="rounded-lg bg-rose-50 p-4 font-bold text-rose-900 dark:bg-rose-950 dark:text-rose-100">{matrix.fn}</td><td className="rounded-lg bg-teal-50 p-4 font-bold text-teal-900 dark:bg-teal-950 dark:text-teal-100">{matrix.tp}</td></tr></tbody></table>
          ) : <p className="mt-4 text-sm text-slate-500">Confusion counts are unavailable.</p>}
        </div>
        <div className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
          <h3 className="font-bold">Probability calibration</h3>
          <p className="mt-1 text-xs text-slate-500">Observed event rate within each predicted-probability bin.</p>
          {calibration.length ? <><div role="img" aria-label="Calibration chart comparing predicted probability and observed event rate; exact values follow in a table" className="mt-3 h-56"><ResponsiveContainer width="100%" height="100%"><LineChart data={calibration} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="predicted" type="number" domain={[0, calibrationAxisMax]} tickFormatter={(value: number) => `${Math.round(value * 100)}%`} /><YAxis domain={[0, calibrationAxisMax]} tickFormatter={(value: number) => `${Math.round(value * 100)}%`} /><Tooltip formatter={(value, name) => [`${(Number(value) * 100).toFixed(1)}%`, name]} /><Line dataKey="observed" name="Observed" stroke="#0f766e" strokeWidth={3} dot isAnimationActive={false} /><Line dataKey="predicted" name="Ideal calibration" stroke="#94a3b8" strokeDasharray="5 4" dot={false} isAnimationActive={false} /></LineChart></ResponsiveContainer></div><details className="mt-3 text-xs"><summary className="cursor-pointer font-semibold text-blue-700 dark:text-blue-300">View calibration bins as a table</summary><table className="mt-2 w-full text-left"><thead><tr><th scope="col">Predicted</th><th scope="col">Observed</th></tr></thead><tbody>{calibration.map((point, index) => <tr key={index} className="border-t border-[var(--panel-border)]"><td className="py-1">{(point.predicted * 100).toFixed(2)}%</td><td>{(point.observed * 100).toFixed(2)}%</td></tr>)}</tbody></table></details></> : <p className="mt-4 text-sm text-slate-500">Calibration bins are unavailable.</p>}
        </div>
      </div>
      {candidates.length > 0 && <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 p-5 dark:border-slate-800"><h3 className="font-bold">Candidate validation comparison</h3><p className="mt-1 text-xs text-slate-500">Validation-set results; assess the selected model with its test-set results above.</p><table className="mt-3 w-full min-w-[480px] text-left text-sm"><thead><tr><th className="py-2">Candidate</th><th>ROC-AUC</th><th>PR-AUC</th><th>Precision</th><th>Sensitivity</th></tr></thead><tbody>{candidates.map(([name, result]) => <tr key={name} className="border-t border-slate-200 dark:border-slate-800"><th className="py-2 font-medium">{name.replaceAll("_", " ")}</th><td>{percent(result.roc_auc)}</td><td>{percent(result.pr_auc)}</td><td>{percent(result.precision)}</td><td>{percent(result.recall_sensitivity)}</td></tr>)}</tbody></table></div>}
      <p className="mt-4 text-xs text-slate-500">{roc.length && pr.length ? "Curves use saved held-out coordinates from this artifact." : "This artifact has no saved ROC/precision-recall coordinates; only measured areas are shown."} Set B results, where available, describe the same ICU research source and do not establish wearable generalisation.</p>
      {typeof metrics.precision === "number" && metrics.precision < 0.1 && (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          Low positive predictive value: this rare-event model intentionally prioritises sensitivity and can produce many false-positive review prompts. It must not replace clinical assessment.
        </p>
      )}
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900"><Database className="h-5 w-5 text-blue-600" /><h3 className="mt-3 font-bold">Dataset</h3><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{evaluation.dataset?.name}</p><p className="mt-1 text-xs text-slate-500">{evaluation.records?.total} records · patient-separated test set</p></div>
        <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900"><Scale className="h-5 w-5 text-blue-600" /><h3 className="mt-3 font-bold">Fairness review</h3><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Subgroup results are recorded in the versioned evaluation artifact.</p></div>
        <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900"><ShieldCheck className="h-5 w-5 text-blue-600" /><h3 className="mt-3 font-bold">Safety boundary</h3><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Critical vital thresholds bypass inference and trigger deterministic escalation.</p></div>
      </div>
      <details className="mt-5 rounded-xl border border-slate-200 p-4 dark:border-slate-800"><summary className="cursor-pointer font-semibold">Outcome and limitations</summary><p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{evaluation.outcome_definition}</p><ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-500">{evaluation.limitations?.map(item => <li key={item}>{item}</li>)}</ul></details>
    </section>
  );
}
