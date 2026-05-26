import { useEffect, useState } from "react";
import { Bot, Send } from "lucide-react";
import { askHealthAI, getAIPatientSummary } from "../services/api";

type Props = {
  patientId: number;
};

export default function HealthAIAssistant({ patientId }: Props) {
  const [summary, setSummary] = useState("");
  const [question, setQuestion] = useState("Why is this patient high risk?");
  const [answer, setAnswer] = useState("");

  useEffect(() => {
    async function loadSummary() {
      try {
        const data = await getAIPatientSummary(patientId);
        setSummary(data.summary);
      } catch {
        setSummary("AI summary unavailable.");
      }
    }

    loadSummary();
  }, [patientId]);

  const ask = async () => {
    try {
      const data = await askHealthAI(patientId, question);
      setAnswer(data.answer);
    } catch {
      setAnswer("AI assistant could not answer right now.");
    }
  };

  return (
    <section className="glass-card rounded-3xl p-6">
      <div className="mb-5 flex items-center gap-3">
        <Bot className="h-6 w-6 text-blue-600" />

        <div>
          <h2 className="text-xl font-bold">Health AI Assistant</h2>
          <p className="text-sm text-slate-500">
            Rule-based assistant using live patient data
          </p>
        </div>
      </div>

      <div className="mb-5 rounded-2xl bg-slate-50 p-4 text-sm leading-7 dark:bg-slate-900">
        {summary}
      </div>

      <div className="flex gap-3">
        <input
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          className="flex-1 rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-900"
        />

        <button
          onClick={ask}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white"
        >
          <Send className="h-4 w-4" />
          Ask
        </button>
      </div>

      {answer && (
        <div className="mt-5 rounded-2xl bg-blue-50 p-4 text-sm leading-7 text-blue-900 dark:bg-blue-950/30 dark:text-blue-100">
          {answer}
        </div>
      )}
    </section>
  );
}