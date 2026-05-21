import { TrendingUp, ShieldAlert } from "lucide-react";
import type { PredictionResult } from "../utils/predictiveRisk";

type Props = {
  prediction: PredictionResult;
};

export default function PredictiveRiskPanel({ prediction }: Props) {
  return (
    <section className="glass-card rounded-3xl p-6">
      <div className="mb-5 flex items-center gap-3">
        <ShieldAlert className="h-6 w-6 text-red-600" />
        <div>
          <h2 className="text-xl font-bold">Predictive Deterioration Score</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Forward-looking AI risk estimate
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-2xl bg-white/70 p-5 dark:bg-slate-900/70">
        <div>
          <p className="text-4xl font-extrabold">{prediction.score}/10</p>
          <p className="mt-1 text-sm font-bold uppercase text-slate-500">
            {prediction.level}
          </p>
        </div>

        <TrendingUp className="h-10 w-10 text-blue-600" />
      </div>

      <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300">
        {prediction.message}
      </p>
    </section>
  );
}