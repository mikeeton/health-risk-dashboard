import { Wifi, WifiOff, Activity } from "lucide-react";
import type { HealthData } from "../data/healthData";

type Props = {
  connected: boolean;
  latestRecord: HealthData | null;
};

export default function WebSocketLivePanel({
  connected,
  latestRecord,
}: Props) {
  return (
    <section className="glass-card rounded-3xl p-6">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-2xl text-white ${
              connected ? "bg-green-600 live-pulse" : "bg-slate-500"
            }`}
          >
            {connected ? (
              <Wifi className="h-5 w-5" />
            ) : (
              <WifiOff className="h-5 w-5" />
            )}
          </div>

          <div>
            <h2 className="text-xl font-bold">WebSocket Live Monitoring</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Real-time vitals stream from backend
            </p>
          </div>
        </div>

        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${
            connected
              ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
          }`}
        >
          {connected ? "CONNECTED" : "OFFLINE"}
        </span>
      </div>

      {!latestRecord ? (
        <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-slate-900">
          Start live monitoring to stream new vitals.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl bg-white/70 p-4 dark:bg-slate-900/70">
            <Activity className="mb-2 h-5 w-5 text-red-500" />
            <p className="text-xs text-slate-500">Heart Rate</p>
            <p className="text-2xl font-bold">{latestRecord.heartRate} bpm</p>
          </div>

          <div className="rounded-2xl bg-white/70 p-4 dark:bg-slate-900/70">
            <p className="text-xs text-slate-500">SpO₂</p>
            <p className="text-2xl font-bold">{latestRecord.spo2}%</p>
          </div>

          <div className="rounded-2xl bg-white/70 p-4 dark:bg-slate-900/70">
            <p className="text-xs text-slate-500">Blood Pressure</p>
            <p className="text-2xl font-bold">
              {latestRecord.systolicBP}/{latestRecord.diastolicBP}
            </p>
          </div>

          <div className="rounded-2xl bg-white/70 p-4 dark:bg-slate-900/70">
            <p className="text-xs text-slate-500">Risk</p>
            <p className="text-2xl font-bold">{latestRecord.riskScore}/10</p>
          </div>
        </div>
      )}
    </section>
  );
}