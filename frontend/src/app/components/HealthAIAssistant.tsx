import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Copy,
  RefreshCw,
  Send,
  Sparkles,
  ShieldAlert,
} from "lucide-react";

import { askHealthAI, getAIPatientSummary } from "../services/api";
import { aiPromptExamples } from "../utils/aiPrompts";
import { parseAIResponse } from "../utils/parseAIResponse";

type Props = {
  patientId: number;
};

function riskClasses(risk: string) {
  if (risk.toLowerCase() === "high") {
    return "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-900";
  }

  if (risk.toLowerCase() === "medium") {
    return "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-300 dark:border-yellow-900";
  }

  if (risk.toLowerCase() === "low") {
    return "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-300 dark:border-green-900";
  }

  return "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800";
}

function AIClinicalCard({
  title,
  text,
  modelUsed,
}: {
  title: string;
  text: string;
  modelUsed?: string;
}) {
  const parsed = useMemo(() => parseAIResponse(text), [text]);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-extrabold text-slate-950 dark:text-white">
            {title}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            AI-generated clinical risk overview
          </p>
        </div>

        {modelUsed && (
          <span className="w-fit rounded-full bg-blue-50 px-4 py-2 text-xs font-bold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
            {modelUsed}
          </span>
        )}
      </div>

      <div className={`mb-5 rounded-2xl border p-5 ${riskClasses(parsed.riskLevel)}`}>
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5" />
          <span className="text-xs font-black uppercase tracking-wide">
            Risk Level
          </span>
        </div>

        <p className="mt-2 text-4xl font-black capitalize">
          {parsed.riskLevel}
        </p>
      </div>

      <div className="space-y-5">
        <div className="rounded-2xl bg-slate-50 p-5 dark:bg-slate-900">
          <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">
            Summary
          </p>
          <p className="text-sm leading-7 text-slate-700 dark:text-slate-300">
            {parsed.summary}
          </p>
        </div>

        <div className="rounded-2xl border border-yellow-100 bg-yellow-50/50 p-5 dark:border-yellow-900/40 dark:bg-yellow-950/20">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <p className="text-xs font-black uppercase tracking-wide text-yellow-700 dark:text-yellow-300">
              Concerns
            </p>
          </div>

          {parsed.concerns.length ? (
            <ul className="space-y-2">
              {parsed.concerns.slice(0, 4).map((concern, index) => (
                <li
                  key={index}
                  className="flex gap-2 text-sm leading-6 text-slate-700 dark:text-slate-300"
                >
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-yellow-500" />
                  <span>{concern}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">
              No specific concerns listed.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5 dark:border-blue-900/40 dark:bg-blue-950/20">
          <div className="mb-3 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-blue-600" />
            <p className="text-xs font-black uppercase tracking-wide text-blue-700 dark:text-blue-300">
              Recommendation
            </p>
          </div>

          <p className="text-sm leading-7 text-blue-950 dark:text-blue-100">
            {parsed.recommendation}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function HealthAIAssistant({ patientId }: Props) {
  const [summary, setSummary] = useState("");
  const [answer, setAnswer] = useState("");
  const [question, setQuestion] = useState("Is this patient okay?");
  const [modelUsed, setModelUsed] = useState("");
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingAnswer, setLoadingAnswer] = useState(false);

  async function loadSummary() {
    try {
      setLoadingSummary(true);
      const data = await getAIPatientSummary(patientId);
      setSummary(data.summary ?? data.message ?? "No summary available.");
      setModelUsed(data.model_used ?? "");
    } catch {
      setSummary(
        "Risk Level: Unknown\n\nSummary:\nAI summary unavailable.\n\nConcerns:\n- Unable to fetch AI response.\n\nRecommendation:\nTry again later."
      );
    } finally {
      setLoadingSummary(false);
    }
  }

  useEffect(() => {
    loadSummary();
  }, [patientId]);

  async function ask(customQuestion?: string) {
    const finalQuestion = customQuestion ?? question;

    try {
      setLoadingAnswer(true);
      setQuestion(finalQuestion);

      const data = await askHealthAI(patientId, finalQuestion);
      setAnswer(data.answer ?? "No answer generated.");
      setModelUsed(data.model_used ?? modelUsed);
    } catch {
      setAnswer(
        "Risk Level: Unknown\n\nSummary:\nAI assistant could not answer right now.\n\nConcerns:\n- Request failed.\n\nRecommendation:\nTry again later."
      );
    } finally {
      setLoadingAnswer(false);
    }
  }

  async function copyText(text: string) {
    await navigator.clipboard.writeText(
      text.replace(/\*\*/g, "").replace(/#/g, "").trim()
    );
  }

  return (
    <section className="glass-card rounded-3xl p-6">
      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/25">
            <Bot className="h-6 w-6" />
          </div>

          <div>
            <h2 className="text-2xl font-extrabold text-slate-950 dark:text-white">
              Health AI Assistant
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Fast Groq-powered clinical risk assistant
            </p>
          </div>
        </div>

        <button
          onClick={loadSummary}
          disabled={loadingSummary}
          className="flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh Summary
        </button>
      </div>

      {loadingSummary ? (
        <div className="rounded-3xl border border-blue-100 bg-blue-50 p-6 dark:border-blue-900 dark:bg-blue-950/30">
          <div className="h-4 w-2/3 animate-pulse rounded bg-blue-100 dark:bg-blue-900/50" />
          <div className="mt-3 h-4 w-full animate-pulse rounded bg-blue-100 dark:bg-blue-900/50" />
          <div className="mt-3 h-4 w-1/2 animate-pulse rounded bg-blue-100 dark:bg-blue-900/50" />
        </div>
      ) : (
        <AIClinicalCard
          title="Clinician Summary"
          text={summary}
          modelUsed={modelUsed}
        />
      )}

      <div className="my-6 flex flex-wrap gap-2">
        {aiPromptExamples.map((prompt) => (
          <button
            key={prompt}
            onClick={() => ask(prompt)}
            className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-bold text-blue-700 transition hover:-translate-y-0.5 hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300"
          >
            <Sparkles className="mr-1 inline h-3 w-3" />
            {prompt}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 md:flex-row">
        <input
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          className="flex-1 rounded-2xl border border-slate-200 bg-white/90 px-5 py-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-blue-950"
          placeholder="Ask about this patient..."
        />

        <button
          onClick={() => ask()}
          disabled={loadingAnswer}
          className="flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-4 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition hover:scale-[1.02] hover:bg-blue-700 disabled:opacity-60"
        >
          <Send className="h-4 w-4" />
          {loadingAnswer ? "Thinking..." : "Ask AI"}
        </button>
      </div>

      {answer && (
        <div className="mt-6">
          <div className="mb-3 flex justify-end">
            <button
              onClick={() => copyText(answer)}
              className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300"
            >
              <Copy className="h-4 w-4" />
              Copy Answer
            </button>
          </div>

          <AIClinicalCard
            title="AI Response"
            text={answer}
            modelUsed={modelUsed}
          />
        </div>
      )}
    </section>
  );
}