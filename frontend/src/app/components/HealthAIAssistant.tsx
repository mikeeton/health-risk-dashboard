import { useEffect, useState } from "react";
import { Bot, Send, Sparkles } from "lucide-react";

import { askHealthAI, getAIPatientSummary } from "../services/api";
import { aiPromptExamples } from "../utils/aiPrompts";

type Props = {
  patientId: number;
};

export default function HealthAIAssistant({ patientId }: Props) {
  const [summary, setSummary] = useState("");
  const [question, setQuestion] = useState("Why is this patient high risk?");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadSummary() {
      try {
        const data = await getAIPatientSummary(patientId);
        setSummary(data.summary ?? data.message ?? "No summary available.");
      } catch {
        setSummary("AI summary unavailable.");
      }
    }

    loadSummary();
  }, [patientId]);

  const ask = async (customQuestion?: string) => {
    const finalQuestion = customQuestion ?? question;

    try {
      setLoading(true);
      setQuestion(finalQuestion);

      const data = await askHealthAI(patientId, finalQuestion);
      setAnswer(data.answer);
    } catch {
      setAnswer("AI assistant could not answer right now.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="glass-card rounded-3xl p-6">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white">
          <Bot className="h-6 w-6" />
        </div>

        <div>
          <h2 className="text-xl font-bold">Health AI Assistant</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Local clinical reasoning assistant using patient data
          </p>
        </div>
      </div>

      <div className="mb-5 rounded-2xl bg-slate-50 p-4 text-sm leading-7 text-slate-700 dark:bg-slate-900 dark:text-slate-300">
        {summary}
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {aiPromptExamples.map((prompt) => (
          <button
            key={prompt}
            onClick={() => ask(prompt)}
            className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300"
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
          className="flex-1 rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-900"
          placeholder="Ask about this patient..."
        />

        <button
          onClick={() => ask()}
          disabled={loading}
          className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700 disabled:opacity-60"
        >
          <Send className="h-4 w-4" />
          {loading ? "Thinking..." : "Ask AI"}
        </button>
      </div>

      {answer && (
        <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-5 text-sm leading-7 text-blue-950 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-100">
          <pre className="whitespace-pre-wrap font-sans">{answer}</pre>
        </div>
      )}
    </section>
  );
}