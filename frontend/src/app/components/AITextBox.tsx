import { AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";
import { parseAIResponse } from "../utils/parseAIResponse";

type Props = {
  title: string;
  text: string;
  modelUsed?: string;
};

function riskStyle(risk: string) {
  if (risk === "High") {
    return "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300";
  }

  if (risk === "Medium") {
    return "border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-900 dark:bg-yellow-950/30 dark:text-yellow-300";
  }

  if (risk === "Low") {
    return "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/30 dark:text-green-300";
  }

  return "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300";
}

export default function AITextBox({ title, text, modelUsed }: Props) {
  const parsed = parseAIResponse(text);

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-extrabold text-slate-950 dark:text-white">
            {title}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Structured AI clinical summary
          </p>
        </div>

        {modelUsed && (
          <span className="w-fit rounded-full bg-blue-50 px-4 py-2 text-xs font-bold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
            Model: {modelUsed}
          </span>
        )}
      </div>

      <div className={`mb-5 rounded-2xl border p-5 ${riskStyle(parsed.riskLevel)}`}>
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5" />
          <p className="text-xs font-black uppercase tracking-wide">
            Risk Level
          </p>
        </div>

        <p className="mt-2 text-4xl font-black">{parsed.riskLevel}</p>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <div className="rounded-2xl bg-slate-50 p-5 dark:bg-slate-900">
          <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">
            Summary
          </p>
          <p className="text-sm leading-7 text-slate-700 dark:text-slate-300">
            {parsed.summary}
          </p>
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

      <div className="mt-5 rounded-2xl border border-yellow-100 bg-yellow-50/60 p-5 dark:border-yellow-900/40 dark:bg-yellow-950/20">
        <div className="mb-3 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-yellow-600" />
          <p className="text-xs font-black uppercase tracking-wide text-yellow-700 dark:text-yellow-300">
            Concerns
          </p>
        </div>

        {parsed.concerns.length > 0 ? (
          <ul className="grid gap-2 md:grid-cols-2">
            {parsed.concerns.map((concern, index) => (
              <li
                key={`${concern}-${index}`}
                className="flex gap-2 text-sm leading-6 text-slate-700 dark:text-slate-300"
              >
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-yellow-500" />
                <span>{concern}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">No specific concerns listed.</p>
        )}
      </div>
    </section>
  );
}