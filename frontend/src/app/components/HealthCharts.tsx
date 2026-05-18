import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card } from "./ui/card";
import type { HealthData } from "../data/healthData";

type HealthChartsProps = {
  data: HealthData[];
  metric: string;
};

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function getRiskDistribution(data: HealthData[]) {
  return [
    {
      name: "Low Risk",
      value: data.filter((item) => item.riskScore <= 3).length,
      color: "#10b981",
    },
    {
      name: "Medium Risk",
      value: data.filter((item) => item.riskScore > 3 && item.riskScore <= 6)
        .length,
      color: "#f59e0b",
    },
    {
      name: "High Risk",
      value: data.filter((item) => item.riskScore > 6).length,
      color: "#ef4444",
    },
  ];
}

function getHealthProfile(data: HealthData[]) {
  const avgHeartRate = average(data.map((item) => item.heartRate));
  const avgSleep = average(data.map((item) => item.sleepHours));
  const avgRisk = average(data.map((item) => item.riskScore));
  const avgSpo2 = average(data.map((item) => item.spo2));
  const avgSteps = average(data.map((item) => item.steps));

  return [
    {
      metric: "Heart",
      score: Math.max(0, Math.min(100, 100 - Math.abs(avgHeartRate - 72))),
    },
    {
      metric: "Sleep",
      score: Math.max(0, Math.min(100, (avgSleep / 8) * 100)),
    },
    {
      metric: "Oxygen",
      score: Math.max(0, Math.min(100, avgSpo2)),
    },
    {
      metric: "Activity",
      score: Math.max(0, Math.min(100, (avgSteps / 10000) * 100)),
    },
    {
      metric: "Risk",
      score: Math.max(0, Math.min(100, 100 - avgRisk * 10)),
    },
  ];
}

export default function HealthCharts({ data, metric }: HealthChartsProps) {
  const showAll = metric === "all";
  const riskDistribution = getRiskDistribution(data);
  const healthProfile = getHealthProfile(data);

  return (
    <>
      {(showAll || metric === "heart") && (
        <Card className="chart-card col-span-12 p-6 xl:col-span-4">
          <h3 className="mb-6 text-lg font-semibold">Heart Rate Trend</h3>

          <ResponsiveContainer width="100%" height={290}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="timestamp"
                tickFormatter={(value) => String(value).slice(5, 10)}
              />
              <YAxis domain={[0, 140]} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="heartRate"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      {(showAll || metric === "oxygen") && (
        <Card className="chart-card col-span-12 p-6 xl:col-span-4">
          <h3 className="mb-6 text-lg font-semibold">Oxygen Level Trend</h3>

          <ResponsiveContainer width="100%" height={290}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="timestamp"
                tickFormatter={(value) => String(value).slice(5, 10)}
              />
              <YAxis domain={[80, 100]} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="spo2"
                stroke="#06b6d4"
                strokeWidth={3}
                dot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      {(showAll || metric === "bp") && (
        <Card className="chart-card col-span-12 p-6 xl:col-span-4">
          <h3 className="mb-6 text-lg font-semibold">Blood Pressure Trend</h3>

          <ResponsiveContainer width="100%" height={290}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="timestamp"
                tickFormatter={(value) => String(value).slice(5, 10)}
              />
              <YAxis domain={[50, 180]} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="systolicBP"
                stroke="#ef4444"
                strokeWidth={3}
                dot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="diastolicBP"
                stroke="#f97316"
                strokeWidth={3}
                dot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      {(showAll || metric === "risk") && (
        <Card className="chart-card col-span-12 p-6 xl:col-span-4">
          <h3 className="mb-6 text-lg font-semibold">Risk Score Trend</h3>

          <ResponsiveContainer width="100%" height={290}>
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="timestamp"
                tickFormatter={(value) => String(value).slice(5, 10)}
              />
              <YAxis domain={[0, 10]} />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="riskScore"
                stroke="#ef4444"
                fill="#fecaca"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      )}

      {(showAll || metric === "steps") && (
        <Card className="chart-card col-span-12 p-6 xl:col-span-4">
          <h3 className="mb-6 text-lg font-semibold">Daily Steps</h3>

          <ResponsiveContainer width="100%" height={290}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="timestamp"
                tickFormatter={(value) => String(value).slice(5, 10)}
              />
              <YAxis />
              <Tooltip />
              <Bar dataKey="steps" fill="#10b981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {(showAll || metric === "sleep") && (
        <Card className="chart-card col-span-12 p-6 xl:col-span-4">
          <h3 className="mb-6 text-lg font-semibold">Sleep Duration</h3>

          <ResponsiveContainer width="100%" height={290}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="timestamp"
                tickFormatter={(value) => String(value).slice(5, 10)}
              />
              <YAxis domain={[0, 10]} />
              <Tooltip />
              <Bar
                dataKey="sleepHours"
                fill="#6366f1"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {showAll && (
        <>
          <Card className="chart-card col-span-12 p-6 xl:col-span-4">
            <h3 className="mb-6 text-lg font-semibold">Risk Distribution</h3>

            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={riskDistribution}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={65}
                  outerRadius={105}
                  paddingAngle={2}
                >
                  {riskDistribution.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>

          <Card className="chart-card col-span-12 p-6 xl:col-span-4">
            <h3 className="mb-6 text-lg font-semibold">Health Profile</h3>

            <ResponsiveContainer width="100%" height={290}>
              <RadarChart data={healthProfile}>
                <PolarGrid />
                <PolarAngleAxis dataKey="metric" />
                <Radar
                  dataKey="score"
                  stroke="#8b5cf6"
                  fill="#c4b5fd"
                  fillOpacity={0.6}
                />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </Card>

          <Card className="chart-card col-span-12 p-6 xl:col-span-4">
            <h3 className="mb-6 text-lg font-semibold">Steps vs Risk Score</h3>

            <ResponsiveContainer width="100%" height={290}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="steps" name="Steps" />
                <YAxis dataKey="riskScore" name="Risk Score" />
                <Tooltip />
                <Scatter data={data} fill="#f59e0b" />
              </ScatterChart>
            </ResponsiveContainer>
          </Card>
        </>
      )}
    </>
  );
}