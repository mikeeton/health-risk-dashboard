import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { HealthData } from "../data/healthData";

export default function ObservedVitalsTrend({ records }: { records: HealthData[] }) {
  const points = [...records]
    .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp))
    .slice(-12)
    .map((record) => ({
      id: record.id,
      time: new Date(record.timestamp).toLocaleString(),
      timeMs: Date.parse(record.timestamp),
      heartRate: Number.isFinite(record.heartRate) ? record.heartRate : null,
      systolic: Number.isFinite(record.systolicBP) ? record.systolicBP : null,
      diastolic: Number.isFinite(record.diastolicBP) ? record.diastolicBP : null,
    }));

  return (
    <section className="glass-card observed-trends-container p-5 sm:p-6" aria-labelledby="observed-trends">
      <h2 id="observed-trends" className="text-lg font-semibold">Observed vital trends</h2>
      <p className="mt-1 text-xs text-[var(--muted-text)]">Most recent recorded observations. Connecting segments have measured endpoints; time between readings is unobserved. Reference ranges require clinical review.</p>
      {!points.length ? <p className="mt-5 text-sm text-[var(--muted-text)]">No observations available for this patient.</p> : (
        <>
          <div className="observed-trends-chart-grid mt-5 grid gap-5 lg:grid-cols-2">
            <div><h3 className="text-sm font-semibold">Heart rate · beats/min</h3><div role="img" aria-label="Heart rate by recorded time" className="mt-3 h-56"><ResponsiveContainer width="100%" height="100%"><LineChart data={points}><CartesianGrid vertical={false} strokeDasharray="3 5" /><XAxis dataKey="timeMs" type="number" domain={["dataMin", "dataMax"]} tickFormatter={(value: number) => new Date(value).toLocaleDateString()} minTickGap={25} /><YAxis width={38} /><Tooltip labelFormatter={(value) => new Date(Number(value)).toLocaleString()} /><Line type="linear" dataKey="heartRate" name="Heart rate (beats/min)" stroke="#0f766e" strokeWidth={2} connectNulls={false} isAnimationActive={false} dot={{ r: 3 }} /></LineChart></ResponsiveContainer></div></div>
            <div><h3 className="text-sm font-semibold">Blood pressure · mmHg</h3><div role="img" aria-label="Systolic and diastolic pressure by recorded time" className="mt-3 h-56"><ResponsiveContainer width="100%" height="100%"><LineChart data={points}><CartesianGrid vertical={false} strokeDasharray="3 5" /><XAxis dataKey="timeMs" type="number" domain={["dataMin", "dataMax"]} tickFormatter={(value: number) => new Date(value).toLocaleDateString()} minTickGap={25} /><YAxis width={38} /><Tooltip labelFormatter={(value) => new Date(Number(value)).toLocaleString()} /><Line type="linear" dataKey="systolic" name="Systolic (mmHg)" stroke="#1d4ed8" strokeWidth={2} connectNulls={false} isAnimationActive={false} dot={{ r: 3 }} /><Line type="linear" dataKey="diastolic" name="Diastolic (mmHg)" stroke="#b45309" strokeWidth={2} connectNulls={false} isAnimationActive={false} dot={{ r: 3 }} /></LineChart></ResponsiveContainer></div></div>
          </div>
          <details className="mt-4 text-sm"><summary className="cursor-pointer font-semibold text-blue-700 dark:text-blue-300">View recorded values as a table</summary><div className="mt-3 overflow-x-auto"><table className="w-full min-w-[440px] text-left"><thead><tr><th className="py-2">Recorded time</th><th>Heart rate (beats/min)</th><th>Systolic (mmHg)</th><th>Diastolic (mmHg)</th></tr></thead><tbody>{points.map((point) => <tr key={point.id} className="border-t border-[var(--panel-border)]"><th scope="row" className="py-2 font-normal">{point.time}</th><td>{point.heartRate ?? "Missing"}</td><td>{point.systolic ?? "Missing"}</td><td>{point.diastolic ?? "Missing"}</td></tr>)}</tbody></table></div></details>
        </>
      )}
    </section>
  );
}
