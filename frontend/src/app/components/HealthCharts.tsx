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

  const visibleCharts =
    metric === "all"
      ? {
          risk: true,
          heartRate: true,
          spo2: true,
          bloodPressure: true,
          sleep: true,
          steps: true,
        }
      : {
          risk: metric === "risk",
          heartRate: metric === "heart",
          spo2: metric === "oxygen",
          bloodPressure: metric === "bp",
          sleep: metric === "sleep",
          steps: metric === "steps",
        };

  return (
    <>
      <div className="sr-only">
        <p id="chart-data-description">The visual charts and this table contain the same sequential health readings.</p>
        <table><caption>Accessible health chart data</caption><thead><tr><th>Reading</th><th>Risk</th><th>Heart rate</th><th>SpO2</th><th>Blood pressure</th><th>Sleep</th><th>Steps</th></tr></thead><tbody>{chartData.map(row => <tr key={row.name}><th>{row.name}</th><td>{row.riskScore}</td><td>{row.heartRate}</td><td>{row.spo2}</td><td>{row.systolicBP}/{row.diastolicBP}</td><td>{row.sleepHours}</td><td>{row.steps}</td></tr>)}</tbody></table>
      </div>
      {visibleCharts.risk && (
        <section className="glass-card chart-card col-span-12 rounded-3xl p-6 xl:col-span-8" aria-describedby="chart-data-description">
          <h2 className="mb-1 text-xl font-bold">Risk Trend</h2>
          <p className="mb-5 text-sm text-slate-500 dark:text-slate-400">
            AI-calculated risk score across recent readings.
          </p>

          <div role="img" aria-label="Risk score trend across recent readings"><ResponsiveContainer width="100%" height={280}>
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
          </ResponsiveContainer></div>
        </section>
      )}

      {visibleCharts.heartRate && (
        <section className="glass-card chart-card col-span-12 rounded-3xl p-6 xl:col-span-6">
          <h2 className="mb-1 text-xl font-bold">Heart Rate</h2>
          <p className="mb-5 text-sm text-slate-500 dark:text-slate-400">
            Beats per minute trend.
          </p>

          <div role="img" aria-label="Heart rate in beats per minute across recent readings"><ResponsiveContainer width="100%" height={280}>
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
          </ResponsiveContainer></div>
        </section>
      )}

      {visibleCharts.spo2 && (
        <section className="glass-card chart-card col-span-12 rounded-3xl p-6 xl:col-span-6">
          <h2 className="mb-1 text-xl font-bold">Oxygen Saturation</h2>
          <p className="mb-5 text-sm text-slate-500 dark:text-slate-400">
            SpO2 percentage trend.
          </p>

          <div role="img" aria-label="Oxygen saturation percentage across recent readings"><ResponsiveContainer width="100%" height={280}>
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
          </ResponsiveContainer></div>
        </section>
      )}

      {visibleCharts.bloodPressure && (
        <section className="glass-card chart-card col-span-12 rounded-3xl p-6 xl:col-span-6">
          <h2 className="mb-1 text-xl font-bold">Blood Pressure</h2>
          <p className="mb-5 text-sm text-slate-500 dark:text-slate-400">
            Systolic and diastolic readings.
          </p>

          <div role="img" aria-label="Systolic and diastolic blood pressure across recent readings"><ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="systolicBP" strokeWidth={3} />
              <Line type="monotone" dataKey="diastolicBP" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer></div>
        </section>
      )}

      {(visibleCharts.sleep || visibleCharts.steps) && (
        <section className="glass-card chart-card col-span-12 rounded-3xl p-6 xl:col-span-6">
          <h2 className="mb-1 text-xl font-bold">Lifestyle Metrics</h2>
          <p className="mb-5 text-sm text-slate-500 dark:text-slate-400">
            Sleep and step activity.
          </p>

          <div role="img" aria-label="Sleep hours and step activity across recent readings"><ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              {visibleCharts.sleep && <Bar dataKey="sleepHours" />}
              {visibleCharts.steps && <Bar dataKey="steps" />}
            </BarChart>
          </ResponsiveContainer></div>
        </section>
      )}
    </>
  );
}
