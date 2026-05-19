import { useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

import StatCard from "../components/StatCard";
import HealthScoreGauge from "../components/HealthScoreGauge";
import AIInsightPanel from "../components/AIInsightPanel";
import AIExplanationPanel from "../components/AIExplanationPanel";
import TrendAnalysisPanel from "../components/TrendAnalysisPanel";
import AlertPanel from "../components/AlertPanel";
import NotificationCenter from "../components/NotificationCenter";
import ClinicianQueue from "../components/ClinicianQueue";
import DataTable from "../components/DataTable";
import HealthCharts from "../components/HealthCharts";
import PatientSwitcher from "../components/PatientSwitcher";

import { useHealthData } from "../context/HealthDataContext";
import {
  generateDynamicInsight,
  getDashboardStats,
  getHealthScore,
} from "../utils/analytics";

import { generateAlerts } from "../utils/alertEngine";
import { calculateRiskScore } from "../utils/riskEngine";
import { calculateBaseline } from "../utils/baseline";
import { analyzeTrends } from "../utils/trendAnalysis";
import { generateLiveHealthRecord } from "../utils/liveMonitoring";
import { buildClinicianQueue } from "../utils/clinicianQueue";
import { createVital } from "../services/api";

export default function Dashboard() {
  const reportRef = useRef<HTMLDivElement>(null);

  const { healthData, selectedPatient, patients, refreshVitals } =
    useHealthData();

  const [dateRange, setDateRange] = useState("7");
  const [metric, setMetric] = useState("all");
  const [liveMonitoring, setLiveMonitoring] = useState(false);

  const patientData = useMemo(() => {
    return healthData.filter(
      (record) => record.patientId === selectedPatient.id
    );
  }, [healthData, selectedPatient.id]);

  const filteredData = useMemo(() => {
    return patientData.slice(-Number(dateRange));
  }, [patientData, dateRange]);

  const [insight, setInsight] = useState(generateDynamicInsight(filteredData));

  const stats = useMemo(() => getDashboardStats(filteredData), [filteredData]);

  const healthScore = useMemo(() => getHealthScore(filteredData), [filteredData]);

  const alerts = useMemo(
    () => generateAlerts(filteredData, selectedPatient),
    [filteredData, selectedPatient]
  );

  const latestRecord =
    filteredData.length > 0 ? filteredData[filteredData.length - 1] : null;

  const baseline = useMemo(() => calculateBaseline(patientData), [patientData]);

  const aiAnalysis = useMemo(() => {
    if (!latestRecord) {
      return {
        riskScore: 0,
        riskLevel: "Low" as const,
        anomalyDetected: false,
        notifyUser: false,
        notifyClinician: false,
        reasons: [],
        advice: [],
      };
    }

    return calculateRiskScore(latestRecord, selectedPatient, baseline);
  }, [latestRecord, selectedPatient, baseline]);

  const trends = useMemo(() => analyzeTrends(filteredData), [filteredData]);

  const clinicianQueue = useMemo(
    () => buildClinicianQueue(patients, healthData),
    [patients, healthData]
  );

  useEffect(() => {
    if (!liveMonitoring) return;
    if (patientData.length === 0) return;

    const interval = setInterval(async () => {
      const liveRecord = generateLiveHealthRecord(selectedPatient.id, baseline);

      const riskResult = calculateRiskScore(
        liveRecord,
        selectedPatient,
        baseline
      );

      liveRecord.riskScore = riskResult.riskScore;

      try {
        await createVital({
          patient_id: liveRecord.patientId,
          timestamp: liveRecord.timestamp,
          heart_rate: liveRecord.heartRate,
          spo2: liveRecord.spo2,
          systolic_bp: liveRecord.systolicBP,
          diastolic_bp: liveRecord.diastolicBP,
          steps: liveRecord.steps,
          sleep_hours: liveRecord.sleepHours,
          active_minutes: liveRecord.activeMinutes,
          calories: liveRecord.calories,
          risk_score: liveRecord.riskScore,
          activity_state: liveRecord.activityState,
        });

        await refreshVitals();
      } catch (error) {
        console.error("Failed to save live monitoring record:", error);
      }
    }, 8000);

    return () => clearInterval(interval);
  }, [
    liveMonitoring,
    selectedPatient,
    selectedPatient.id,
    baseline,
    patientData.length,
    refreshVitals,
  ]);

  const generateInsight = () => {
    setInsight(generateDynamicInsight(filteredData));
  };

  const exportPDF = async () => {
    if (!reportRef.current) return;

    const canvas = await html2canvas(reportRef.current, {
      scale: 2,
      backgroundColor: document.documentElement.classList.contains("dark")
        ? "#020617"
        : "#f8fafc",
    });

    const imageData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");

    const pageWidth = pdf.internal.pageSize.getWidth();
    const imageHeight = (canvas.height * pageWidth) / canvas.width;

    pdf.addImage(imageData, "PNG", 0, 0, pageWidth, imageHeight);
    pdf.save(`${selectedPatient.name}-health-risk-report.pdf`);
  };

  return (
    <div ref={reportRef} className="dashboard-shell space-y-8">
      <section className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-4">
          <label className="font-medium text-gray-700 dark:text-gray-300">
            Patient:
          </label>

          <PatientSwitcher />

          <label className="font-medium text-gray-700 dark:text-gray-300">
            Date Range:
          </label>

          <select
            value={dateRange}
            onChange={(event) => setDateRange(event.target.value)}
            className="rounded-xl bg-gray-100 px-4 py-3 dark:bg-slate-800"
          >
            <option value="7">7 records</option>
            <option value="14">14 records</option>
            <option value="30">30 records</option>
          </select>

          <label className="font-medium text-gray-700 dark:text-gray-300">
            Metric:
          </label>

          <select
            value={metric}
            onChange={(event) => setMetric(event.target.value)}
            className="rounded-xl bg-gray-100 px-4 py-3 dark:bg-slate-800"
          >
            <option value="all">All Metrics</option>
            <option value="heart">Heart Rate</option>
            <option value="oxygen">Oxygen</option>
            <option value="bp">Blood Pressure</option>
            <option value="sleep">Sleep</option>
            <option value="steps">Steps</option>
            <option value="risk">Risk Score</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setLiveMonitoring((value) => !value)}
            className={`rounded-lg px-4 py-2 font-medium transition hover:-translate-y-0.5 hover:shadow-md ${
              liveMonitoring
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-green-600 text-white hover:bg-green-700"
            }`}
          >
            {liveMonitoring ? "Stop Live Monitoring" : "Start Live Monitoring"}
          </button>

          <button
            onClick={exportPDF}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-medium transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-900"
          >
            Export PDF
          </button>
        </div>
      </section>

      <p className="text-sm text-gray-500 dark:text-gray-400">
        Showing analytics for <strong>{selectedPatient.name}</strong> —{" "}
        {selectedPatient.condition}
      </p>

      {liveMonitoring && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700 dark:border-green-900/60 dark:bg-green-950/30 dark:text-green-400">
          Live monitoring is active. New smartwatch-style readings are being
          generated every 8 seconds and saved to the backend database.
        </div>
      )}

      <AIInsightPanel insight={insight} onGenerate={generateInsight} />

      <AlertPanel alerts={alerts} />

      <NotificationCenter alerts={alerts} />

      <ClinicianQueue queue={clinicianQueue} />

      <AIExplanationPanel
        reasons={aiAnalysis.reasons}
        riskLevel={aiAnalysis.riskLevel}
      />

      <TrendAnalysisPanel trends={trends} />

      <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-5">
        <StatCard
          title="Average Risk Score"
          value={`${stats.avgRisk}/10`}
          description="Generated by AI risk engine"
          status={
            stats.avgRisk >= 6
              ? "alert"
              : stats.avgRisk >= 4
              ? "warning"
              : "good"
          }
        />

        <StatCard
          title="Average Heart Rate"
          value={`${stats.avgHeartRate} bpm`}
          description={
            stats.avgHeartRate > 85 ? "Above expected range" : "Stable range"
          }
          status={stats.avgHeartRate > 85 ? "warning" : "good"}
        />

        <StatCard
          title="Average Oxygen"
          value={`${stats.avgSpo2}%`}
          description={
            stats.avgSpo2 < 94 ? "Below expected range" : "Normal range"
          }
          status={
            stats.avgSpo2 < 92
              ? "alert"
              : stats.avgSpo2 < 94
              ? "warning"
              : "good"
          }
        />

        <StatCard
          title="Avg Blood Pressure"
          value={`${stats.avgSystolicBP}/${stats.avgDiastolicBP}`}
          description={
            stats.avgSystolicBP > 140 ? "Elevated reading" : "Stable reading"
          }
          status={
            stats.avgSystolicBP > 140
              ? "alert"
              : stats.avgSystolicBP > 130
              ? "warning"
              : "good"
          }
        />

        <StatCard
          title="Avg Sleep Duration"
          value={`${stats.avgSleep}h`}
          description={stats.avgSleep < 7 ? "Below recommended" : "Healthy range"}
          status={
            stats.avgSleep < 6
              ? "alert"
              : stats.avgSleep < 7
              ? "warning"
              : "good"
          }
        />
      </section>

      <section className="dashboard-grid">
        <div className="col-span-12 xl:col-span-4">
          <HealthScoreGauge score={healthScore} />
        </div>

        <HealthCharts data={filteredData} metric={metric} />
      </section>

      <DataTable data={filteredData} />
    </div>
  );
}