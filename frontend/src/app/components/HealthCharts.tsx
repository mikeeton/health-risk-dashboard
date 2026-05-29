import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { HealthData } from "../data/healthData";

type Props = {
  data: HealthData[];
  metric: string;
};

export default function HealthCharts({ data, metric }: Props) {
  const chartData = data.map((item, index) => ({
    name: `R${index + 1}`,
    heartRate: item.heartRate,
    spo2: item.spo2,
    riskScore: item.riskScore,
    sleepHours: item.sleepHours,
    systolicBP: item.systolicBP,
    diastolicBP: item.diastolicBP,
    steps: item.steps,
  }));

  return (
    <>
      <section className="glass-card chart-card col-span-12 rounded-3xl p-6 xl:col-span-8">
        <h2 className="mb-1 text-xl font-bold">Risk Trend</h2>
        <p className="mb-5 text-sm text-slate-500 dark:text-slate-400">
          AI-calculated risk score across recent readings.
        </p>

        <ResponsiveContainer width="100%" height="80%">
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis domain={[0, 10]} />
            <Tooltip />
            <Area
              type="monotone"
              dataKey="riskScore"
              strokeWidth={3}
              fillOpacity={0.2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </section>

      <section className="glass-card chart-card col-span-12 rounded-3xl p-6 xl:col-span-6">
        <h2 className="mb-1 text-xl font-bold">Heart Rate</h2>
        <p className="mb-5 text-sm text-slate-500 dark:text-slate-400">
          Beats per minute trend.
        </p>

        <ResponsiveContainer width="100%" height="80%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="heartRate"
              strokeWidth={3}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </section>

      <section className="glass-card chart-card col-span-12 rounded-3xl p-6 xl:col-span-6">
        <h2 className="mb-1 text-xl font-bold">Oxygen Saturation</h2>
        <p className="mb-5 text-sm text-slate-500 dark:text-slate-400">
          SpO₂ percentage trend.
        </p>

        <ResponsiveContainer width="100%" height="80%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis domain={[80, 100]} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="spo2"
              strokeWidth={3}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </section>

      <section className="glass-card chart-card col-span-12 rounded-3xl p-6 xl:col-span-6">
        <h2 className="mb-1 text-xl font-bold">Blood Pressure</h2>
        <p className="mb-5 text-sm text-slate-500 dark:text-slate-400">
          Systolic and diastolic readings.
        </p>

        <ResponsiveContainer width="100%" height="80%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="systolicBP" strokeWidth={3} />
            <Line type="monotone" dataKey="diastolicBP" strokeWidth={3} />
          </LineChart>
        </ResponsiveContainer>
      </section>

      <section className="glass-card chart-card col-span-12 rounded-3xl p-6 xl:col-span-6">
        <h2 className="mb-1 text-xl font-bold">Lifestyle Metrics</h2>
        <p className="mb-5 text-sm text-slate-500 dark:text-slate-400">
          Sleep and step activity.
        </p>

        <ResponsiveContainer width="100%" height="80%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="sleepHours" />
            <Bar dataKey="steps" />
          </BarChart>
        </ResponsiveContainer>
      </section>
    </>
  );
}