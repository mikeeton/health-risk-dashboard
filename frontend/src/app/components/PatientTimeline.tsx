import { Activity, HeartPulse, Clock } from "lucide-react";
import type { HealthData } from "../data/healthData";

type Props = {
  records: HealthData[];
};

export default function PatientTimeline({ records }: Props) {
  const latest = records.slice(-8).reverse();

  return (
    <section className="glass-card rounded-3xl p-6">
      <div className="mb-5 flex items-center gap-3">
        <Clock className="h-6 w-6 text-blue-600" />
        <div>
          <h2 className="text-xl font-bold">Patient Timeline</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Recent vital events
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {latest.map((record) => (
          <div key={record.id} className="flex gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-white">
              {record.riskScore >= 7 ? (
                <HeartPulse className="h-5 w-5" />
              ) : (
                <Activity className="h-5 w-5" />
              )}
            </div>

            <div className="flex-1 rounded-2xl bg-white/70 p-4 dark:bg-slate-900/70">
              <p className="font-bold">
                Risk {record.riskScore}/10 • {record.activityState}
              </p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                HR {record.heartRate} bpm, SpO₂ {record.spo2}%, BP{" "}
                {record.systolicBP}/{record.diastolicBP}
              </p>
              <p className="mt-1 text-xs text-slate-400">{record.timestamp}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}