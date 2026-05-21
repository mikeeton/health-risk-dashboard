import { Sparkles, BrainCircuit } from "lucide-react";
import { Button } from "./ui/button";

type Props = {
  insight: string;
  onGenerate: () => void;
};

export default function AIInsightPanel({ insight, onGenerate }: Props) {
  return (
    <section className="glass-card fade-up rounded-3xl p-6 card-hover">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/25">
            <BrainCircuit className="h-5 w-5" />
          </div>

          <div>
            <h2 className="text-xl font-bold">AI Clinical Insight</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Generated from baseline, trends, risk scoring, and latest vitals.
            </p>
          </div>
        </div>

        <Button
          onClick={onGenerate}
          className="rounded-2xl bg-blue-600 px-5 py-3 text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700"
        >
          <Sparkles className="mr-2 h-4 w-4" />
          Generate Insight
        </Button>
      </div>

      <p className="mt-5 leading-8 text-slate-700 dark:text-slate-200">
        {insight || "No health data available for analysis."}
      </p>
    </section>
  );
}