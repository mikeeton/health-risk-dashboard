type AlertRecord = Record<string, unknown>;

function parseList(value: unknown): Array<Record<string, unknown> | string> {
  if (typeof value !== "string" || !value) return [];
  try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
}

export default function StructuredAlertCard({ item, canAct, onAction }: { item: AlertRecord; canAct: boolean; onAction: (action: string, payload?: Record<string, unknown>) => void }) {
  const evidence = parseList(item.evidence_json);
  const shap = parseList(item.shap_json).slice(0, 5);
  const checks = parseList(item.recommended_checks_json);
  const closed = ["Resolved", "Dismissed"].includes(String(item.status));
  const probability = typeof item.probability === "number" ? `${(item.probability * 100).toFixed(1)}%` : "Not applicable";
  return (
    <article className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800" aria-labelledby={`alert-${item.id}-title`}>
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-blue-600">{String(item.alert_type ?? "clinical review").replaceAll("_", " ")}</p><h3 id={`alert-${item.id}-title`} className="mt-1 text-lg font-extrabold">{String(item.patient_name)} · {String(item.risk_level)}</h3></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold capitalize dark:bg-slate-800">{String(item.status)}</span></div>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><div><dt className="text-xs text-slate-500">Current risk</dt><dd className="font-bold">{String(item.risk_level)}</dd></div><div><dt className="text-xs text-slate-500">Predicted risk</dt><dd className="font-bold">{String(item.predicted_risk_level ?? "Not applicable")}</dd></div><div><dt className="text-xs text-slate-500">Six-hour probability</dt><dd className="font-bold">{probability}</dd></div><div><dt className="text-xs text-slate-500">Model version</dt><dd className="font-bold">{String(item.model_version ?? "Deterministic rule")}</dd></div></dl>
      {evidence.length > 0 && <section className="mt-4 rounded-xl bg-slate-50 p-4 dark:bg-slate-900"><h4 className="text-sm font-bold">Supporting evidence</h4><ul className="mt-2 space-y-2 text-sm text-slate-600 dark:text-slate-300">{evidence.map((entry, index) => <li key={index}>{typeof entry === "string" ? entry : <><time>{String(entry.timestamp ?? "Unknown time")}</time>: {String(entry.observation ?? "")}</>}</li>)}</ul></section>}
      {shap.length > 0 && <details className="mt-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800"><summary className="cursor-pointer text-sm font-bold">SHAP feature contributions</summary><ul className="mt-2 space-y-1 text-sm">{shap.map((entry, index) => <li key={index} className="flex justify-between gap-3"><span>{typeof entry === "string" ? entry : String(entry.feature ?? "feature").replaceAll("_", " ")}</span><span>{typeof entry === "string" ? "" : Number(entry.contribution ?? 0).toFixed(3)}</span></li>)}</ul></details>}
      {checks.length > 0 && <details className="mt-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800"><summary className="cursor-pointer text-sm font-bold">Recommended checks</summary><ul className="mt-2 list-disc pl-5 text-sm">{checks.map((entry, index) => <li key={index}>{String(entry)}</li>)}</ul></details>}
      <div className="mt-4 grid gap-2 text-xs text-slate-500 sm:grid-cols-3"><span>Contact: {String(item.contact_status ?? "not contacted").replaceAll("_", " ")}</span><span>Escalation due: {String(item.escalation_due_at ?? "Not set")}</span><span>Duplicates suppressed: {String(item.duplicate_updates ?? 0)}</span></div>
      {canAct && !closed && <div className="mt-4 flex flex-wrap gap-3"><button className="text-xs font-bold text-blue-700" onClick={() => onAction("acknowledge")}>Acknowledge & own</button><button className="text-xs font-bold text-amber-700" onClick={() => onAction("under_review")}>Mark under review</button><button className="text-xs font-bold text-violet-700" onClick={() => onAction("contacted", { contact_status: "contacted" })}>Patient contacted</button><button className="text-xs font-bold text-emerald-700" onClick={() => onAction("resolve", { resolution_reason: "Reviewed and action completed" })}>Resolve</button><button className="text-xs font-bold text-slate-600" onClick={() => onAction("dismiss", { resolution_reason: "Reviewed and assessed as a false-positive prompt" })}>Dismiss as false positive</button></div>}
    </article>
  );
}
