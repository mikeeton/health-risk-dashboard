import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Copy,
  Database,
  RefreshCw,
  Send,
  ShieldAlert,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Trash2,
} from "lucide-react";

import {
  askHealthAI,
  clearAIMemory,
  getAIConfiguration,
  getAIPatientSummary,
  submitAIFeedback,
  type ClinicalAIResponse,
} from "../services/api";
import { useAuth } from "../context/AuthContext";

type Props = { patientId: number };

const profiles = {
  patient: {
    heading: "My Health AI Assistant",
    subtitle: "Plain-language, evidence-linked support for your health record",
    defaultQuestion: "Can you explain my latest readings simply?",
    prompts: [
      "Explain my risk level simply.",
      "What information is missing?",
      "What should I ask my care team?",
      "When should I seek urgent help?",
    ],
  },
  doctor: {
    heading: "Clinician AI Assistant",
    subtitle: "Evidence-linked clinical review with mandatory human verification",
    defaultQuestion: "Summarise the current risk and evidence.",
    prompts: [
      "Summarise this patient with evidence.",
      "Which observations need confirmation?",
      "What should be checked next?",
      "Create an evidence-linked handover.",
    ],
  },
  nurse: {
    heading: "Nursing AI Assistant",
    subtitle: "Evidence-linked monitoring, adherence, and escalation support",
    defaultQuestion: "What should nursing monitor and escalate?",
    prompts: [
      "What should I monitor next?",
      "Are there adherence concerns?",
      "Which changes require escalation?",
      "Create a care-team update.",
    ],
  },
};

function riskClasses(risk: string) {
  if (risk === "Critical" || risk === "High")
    return "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300";
  if (risk === "Medium")
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300";
  if (risk === "Low")
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300";
  return "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300";
}

function DetailList({
  title,
  items,
  tone = "slate",
}: {
  title: string;
  items: string[];
  tone?: "slate" | "blue" | "amber" | "red";
}) {
  const tones = {
    slate: "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900",
    blue: "border-blue-200 bg-blue-50/70 dark:border-blue-900/50 dark:bg-blue-950/20",
    amber: "border-amber-200 bg-amber-50/70 dark:border-amber-900/50 dark:bg-amber-950/20",
    red: "border-red-200 bg-red-50/70 dark:border-red-900/50 dark:bg-red-950/20",
  };
  return (
    <section className={`rounded-2xl border p-4 ${tones[tone]}`}>
      <h4 className="text-xs font-extrabold uppercase tracking-[0.1em]">{title}</h4>
      {items.length ? (
        <ul className="mt-3 space-y-2">
          {items.map((item) => (
            <li key={item} className="flex gap-2 text-sm leading-6">
              <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-60" />
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-slate-500">None recorded.</p>
      )}
    </section>
  );
}

function StructuredResponseCard({
  response,
  title,
}: {
  response: ClinicalAIResponse;
  title: string;
}) {
  const output = response.output;
  const confidence = Math.round(output.confidence * 100);
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 dark:border-slate-800 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-xl font-extrabold">{title}</h3>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-slate-500">
            <span className="flex items-center gap-1.5">
              <Clock3 className="h-3.5 w-3.5" />
              Generated {new Date(response.generated_at).toLocaleString()}
            </span>
            <span>{response.model_used}</span>
            <span>{response.prompt_version}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={`rounded-full border px-3 py-1.5 text-xs font-extrabold ${
            response.data_freshness.is_stale
              ? "border-amber-200 bg-amber-50 text-amber-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}>
            {response.data_freshness.is_stale
              ? "Stale data"
              : `Data ${response.data_freshness.age_hours ?? 0}h old`}
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            Provider: {response.provider_status.replaceAll("_", " ")}
          </span>
        </div>
      </header>

      <div className="mt-5 grid gap-4 lg:grid-cols-[220px_1fr]">
        <div className={`rounded-2xl border p-5 ${riskClasses(output.risk_level)}`}>
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide">
            <ShieldAlert className="h-5 w-5" /> Risk level
          </div>
          <p className="mt-3 text-3xl font-black">{output.risk_level}</p>
          <p className="mt-5 text-xs font-bold">Confidence {confidence}%</p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/10">
            <div className="h-full rounded-full bg-current" style={{ width: `${confidence}%` }} />
          </div>
        </div>
        <section className="rounded-2xl bg-slate-50 p-5 dark:bg-slate-900">
          <h4 className="text-xs font-extrabold uppercase tracking-[0.1em] text-slate-500">Summary</h4>
          <p className="mt-3 text-sm leading-7 text-slate-700 dark:text-slate-300">
            {output.summary}
          </p>
        </section>
      </div>

      <section className="mt-4 rounded-2xl border border-blue-200 bg-blue-50/60 p-4 dark:border-blue-900/50 dark:bg-blue-950/20">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-blue-600" />
          <h4 className="text-xs font-extrabold uppercase tracking-[0.1em] text-blue-700 dark:text-blue-300">
            Supporting evidence
          </h4>
        </div>
        {output.supporting_evidence.length ? (
          <div className="mt-3 grid gap-3">
            {output.supporting_evidence.map((evidence) => (
              <div key={`${evidence.source_id}-${evidence.relevance}`} className="rounded-xl border border-blue-100 bg-white p-3 dark:border-blue-900/50 dark:bg-slate-950">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <code className="rounded bg-blue-100 px-2 py-1 text-xs font-bold text-blue-800 dark:bg-blue-950 dark:text-blue-200">
                    {evidence.source_id}
                  </code>
                  <time className="text-xs text-slate-500">{evidence.timestamp || "Time unavailable"}</time>
                </div>
                <p className="mt-2 text-sm font-semibold">{evidence.observation}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">{evidence.relevance}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-500">No timestamped evidence was available.</p>
        )}
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <DetailList title="Missing information" items={output.missing_information} tone="amber" />
        <DetailList title="Recommended checks" items={output.recommended_checks} tone="blue" />
        <DetailList title="Escalation conditions" items={output.escalation_conditions} tone="red" />
      </div>

      <div className="mt-4 flex gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm font-semibold text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
        {output.safety_warning}
      </div>
    </article>
  );
}

export default function HealthAIAssistant({ patientId }: Props) {
  const { user } = useAuth();
  const profile =
    user?.role === "patient"
      ? profiles.patient
      : user?.role === "nurse"
        ? profiles.nurse
        : profiles.doctor;
  const previousPatientId = useRef<number | null>(null);
  const [summary, setSummary] = useState<ClinicalAIResponse | null>(null);
  const [answer, setAnswer] = useState<ClinicalAIResponse | null>(null);
  const [question, setQuestion] = useState(profile.defaultQuestion);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  const [feedback, setFeedback] = useState<"helpful" | "not_helpful" | null>(null);
  const [configuration, setConfiguration] = useState<{ enabled?: boolean; governance_ready?: boolean } | null>(null);

  async function loadSummary() {
    try {
      setLoading(true);
      setError("");
      setSummary(await getAIPatientSummary(patientId));
    } catch {
      setError("The assistant is unavailable. Continue using the patient record directly.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void getAIConfiguration().then(setConfiguration).catch(() => setConfiguration(null));
  }, []);

  useEffect(() => {
    const previous = previousPatientId.current;
    if (previous !== null && previous !== patientId) {
      void clearAIMemory(previous);
    }
    previousPatientId.current = patientId;
    setSummary(null);
    setAnswer(null);
    setFeedback(null);
    setReviewConfirmed(false);
    setQuestion(profile.defaultQuestion);
    void loadSummary();
  }, [patientId, profile.defaultQuestion]);

  async function ask(customQuestion?: string) {
    const finalQuestion = customQuestion ?? question.trim();
    if (!finalQuestion) return;
    try {
      setLoading(true);
      setError("");
      setQuestion(finalQuestion);
      setAnswer(await askHealthAI(patientId, finalQuestion));
      setReviewConfirmed(false);
      setFeedback(null);
    } catch {
      setError("No AI response was accepted. Review the source record and try again later.");
    } finally {
      setLoading(false);
    }
  }

  async function copyResponse(response: ClinicalAIResponse) {
    if (!reviewConfirmed) return;
    await navigator.clipboard.writeText(response.answer);
  }

  async function rateResponse(rating: "helpful" | "not_helpful") {
    if (!answer) return;
    await submitAIFeedback(patientId, { response_id: answer.response_id, rating });
    setFeedback(rating);
  }

  async function clearConversation() {
    await clearAIMemory(patientId);
    setAnswer(null);
    setQuestion(profile.defaultQuestion);
    setReviewConfirmed(false);
  }

  return (
    <section className="glass-card p-5 sm:p-6">
      <div role="note" className="mb-5 flex gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm font-semibold text-blue-950 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-100">
        <ClipboardCheck className="mt-0.5 h-5 w-5 shrink-0" />
        <span>
          <strong>AI-assisted—not a diagnosis.</strong> Every statement must be verified against its timestamped evidence before use.
        </span>
      </div>

      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/25">
            <Bot className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold">{profile.heading}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{profile.subtitle}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={clearConversation} className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-bold dark:border-slate-700">
            <Trash2 className="h-4 w-4" /> Clear memory
          </button>
          <button onClick={loadSummary} disabled={loading} className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>
      </header>

      {configuration && (!configuration.enabled || !configuration.governance_ready) && (
        <div className="mt-5 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
          External AI is disabled until configuration and governance gates pass. Deterministic safety summaries remain available.
        </div>
      )}
      {error && (
        <div role="alert" className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="mt-6">
        {loading && !summary ? (
          <div className="min-h-52 animate-pulse rounded-3xl bg-blue-50 dark:bg-blue-950/20" />
        ) : summary ? (
          <StructuredResponseCard response={summary} title="Current evidence-linked summary" />
        ) : null}
      </div>

      <div className="my-6 flex flex-wrap gap-2">
        {profile.prompts.map((prompt) => (
          <button key={prompt} onClick={() => ask(prompt)} className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300">
            <Sparkles className="mr-1 inline h-3 w-3" /> {prompt}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 md:flex-row">
        <input
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void ask();
          }}
          className="h-12 flex-1 rounded-xl border border-slate-200 bg-white px-4 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900"
          placeholder="Ask a patient-specific question…"
        />
        <button onClick={() => ask()} disabled={loading} className="clinical-button flex h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-bold text-white disabled:opacity-60">
          <Send className="h-4 w-4" /> {loading ? "Validating…" : "Ask AI"}
        </button>
      </div>

      {answer && (
        <div className="mt-6" aria-live="polite">
          <div className="mb-3 flex flex-col gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex items-center gap-2 text-xs font-semibold">
              <input type="checkbox" checked={reviewConfirmed} onChange={(event) => setReviewConfirmed(event.target.checked)} />
              I verified the response against every cited record
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => rateResponse("helpful")} className={`app-icon-button h-9 w-9 flex-[0_0_36px] ${feedback === "helpful" ? "text-emerald-600" : ""}`} aria-label="Helpful response">
                <ThumbsUp className="h-4 w-4" />
              </button>
              <button onClick={() => rateResponse("not_helpful")} className={`app-icon-button h-9 w-9 flex-[0_0_36px] ${feedback === "not_helpful" ? "text-red-600" : ""}`} aria-label="Not helpful response">
                <ThumbsDown className="h-4 w-4" />
              </button>
              <button onClick={() => copyResponse(answer)} disabled={!reviewConfirmed} className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700">
                <Copy className="h-4 w-4" /> Copy
              </button>
            </div>
          </div>
          <StructuredResponseCard response={answer} title="Assistant response" />
          {feedback && (
            <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-emerald-700">
              <CheckCircle2 className="h-4 w-4" /> Feedback saved without storing the response text.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
