import { useEffect, useMemo, useRef, useState } from "react";

import StatCard from "../components/StatCard";
import LinearRegressionPanel from "../components/LinearRegressionPanel";
import HealthAIAssistant from "../components/HealthAIAssistant";
import ClinicianPdfReportButton from "../components/ClinicianPdfReportButton";
import HealthScoreGauge from "../components/HealthScoreGauge";
import AIInsightPanel from "../components/AIInsightPanel";
import AIExplanationPanel from "../components/AIExplanationPanel";
import TrendAnalysisPanel from "../components/TrendAnalysisPanel";
import AlertPanel from "../components/AlertPanel";
import ClinicianQueue from "../components/ClinicianQueue";
import ClinicianActivityFeed from "../components/ClinicianActivityFeed";
import PatientDetailModal from "../components/PatientDetailModal";
import DataTable from "../components/DataTable";
import HealthCharts from "../components/HealthCharts";
import PatientSwitcher from "../components/PatientSwitcher";
import WebSocketLivePanel from "../components/WebSocketLivePanel";
import AIClinicianReport from "../components/AIClinicianReport";
import PredictiveRiskPanel from "../components/PredictiveRiskPanel";
import PatientTimeline from "../components/PatientTimeline";
import MedicationPanel from "../components/MedicationPanel";
import DatabaseActivityFeed from "../components/DatabaseActivityFeed";
import MedicationAdherenceDatabase from "../components/MedicationAdherenceDatabase";
import PatientTimelineDatabase from "../components/PatientTimelineDatabase";
import MLPredictionPanel from "../components/MLPredictionPanel";
import WithingsIntegration from "../components/WithingsIntegration";

import { useHealthData } from "../context/HealthDataContext";
import { useAuth } from "../context/AuthContext";
import {
  generateDynamicInsight,
  getDashboardStats,
  getHealthScore,
} from "../utils/analytics";

import { generateAlerts } from "../utils/alertEngine";
import { calculateRiskScore } from "../utils/riskEngine";
import { calculateBaseline } from "../utils/baseline";
import { analyzeTrends } from "../utils/trendAnalysis";
import { buildClinicianQueue } from "../utils/clinicianQueue";
import { createVital } from "../services/api";
import { createLiveVitalsSocket } from "../services/liveSocket";
import { predictDeteriorationRisk } from "../utils/predictiveRisk";
import { generateClinicianReport } from "../utils/clinicianReport";

import type { HealthData } from "../data/healthData";

export default function Dashboard() {
  const reportRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<WebSocket | null>(null);

  const {
    healthData,
    setHealthData,
    selectedPatient,
    patients,
    hasPatients,
    loading,
    refreshVitals,
  } = useHealthData();
  const { isDoctor, isNurse, isPatient } = useAuth();

  const [dateRange, setDateRange] = useState("7");
  const [metric, setMetric] = useState("all");
  const [liveMonitoring, setLiveMonitoring] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [latestSocketRecord, setLatestSocketRecord] =
    useState<HealthData | null>(null);
  const [patientModalOpen, setPatientModalOpen] = useState(false);

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

  const prediction = useMemo(
    () => predictDeteriorationRisk(patientData),
    [patientData]
  );

  const clinicianReport = useMemo(
    () => generateClinicianReport(selectedPatient, patientData, prediction),
    [selectedPatient, patientData, prediction]
  );

  useEffect(() => {
    setInsight(generateDynamicInsight(filteredData));
  }, [filteredData]);

  useEffect(() => {
    return () => {
      socketRef.current?.close();
    };
  }, []);

  useEffect(() => {
    socketRef.current?.close();
    setSocketConnected(false);
    setLatestSocketRecord(null);
    setLiveMonitoring(false);
  }, [selectedPatient.id]);

  if (loading) {
    return (
      <section className="glass-card rounded-3xl p-8" aria-live="polite">
        Loading assigned patients…
      </section>
    );
  }

  if (!hasPatients) {
    return (
      <section className="glass-card rounded-3xl p-8">
        <h1 className="text-2xl font-extrabold">No accessible patients</h1>
        <p className="mt-3 max-w-2xl text-slate-600 dark:text-slate-300">
          {isPatient
            ? "Your account is not linked to a patient record yet. Ask an administrator to approve and link your registration."
            : "No patient is assigned to this account. Create a patient as a doctor, or ask an administrator to add a staff assignment."}
        </p>
      </section>
    );
  }

  const handleLiveSocketRecord = async (record: HealthData) => {
    setLatestSocketRecord(record);

    setHealthData((previousData) => {
      const alreadyExists = previousData.some((item) => item.id === record.id);

      if (alreadyExists) return previousData;

      return [...previousData, record];
    });

    try {
      if (record.persisted) {
        await refreshVitals();
        return;
      }
      await createVital({
        patient_id: record.patientId,
        timestamp: record.timestamp,
        heart_rate: record.heartRate,
        spo2: record.spo2,
        systolic_bp: record.systolicBP,
        diastolic_bp: record.diastolicBP,
        steps: record.steps,
        sleep_hours: record.sleepHours,
        active_minutes: record.activeMinutes,
        calories: record.calories,
        risk_score: record.riskScore,
        activity_state: record.activityState,
      });

      await refreshVitals();
    } catch (error) {
      console.error("Failed to persist WebSocket vital:", error);
    }
  };

  const toggleLiveMonitoring = () => {
    if (liveMonitoring) {
      socketRef.current?.close();
      socketRef.current = null;
      setLiveMonitoring(false);
      setSocketConnected(false);
      return;
    }

    const socket = createLiveVitalsSocket(
      selectedPatient.id,
      handleLiveSocketRecord,
      () => {
        setSocketConnected(true);
        setLiveMonitoring(true);
      },
      () => {
        setSocketConnected(false);
      },
      () => {
        setSocketConnected(false);
      }
    );

    socketRef.current = socket;
  };

  const generateInsight = () => {
    setInsight(generateDynamicInsight(filteredData));
  };

  const exportPDF = async () => {
    if (!reportRef.current) return;

    const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
      import("html2canvas"),
      import("jspdf"),
    ]);

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
    <>
      <div ref={reportRef} className="dashboard-shell space-y-8">
        <section id="dashboard-controls" className="control-deck glass-card fade-up scroll-mt-28 p-5 sm:p-6">
          <div className="grid gap-5">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(220px,1fr)_auto_140px_170px] lg:items-end">
              <div className="min-w-0">
                <label htmlFor="assigned-patient-switcher" className="mb-2 block text-xs font-bold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
                  Patient
                </label>
                <PatientSwitcher />
              </div>
              <button
                onClick={() => setPatientModalOpen(true)}
                className="clinical-button h-11 w-full rounded-xl bg-slate-900 px-4 text-sm font-bold text-white shadow-md hover:bg-slate-800 dark:bg-white dark:text-slate-950 lg:w-auto"
              >
                View Patient
              </button>
              <div>
                <label htmlFor="dashboard-date-range" className="mb-2 block text-xs font-bold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
                  Date range
                </label>
                <select id="dashboard-date-range" name="dashboard_date_range" aria-label="Dashboard date range"
                  value={dateRange}
                  onChange={(event) => setDateRange(event.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white/80 px-4 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900/80"
                >
                  <option value="7">7 records</option>
                  <option value="14">14 records</option>
                  <option value="30">30 records</option>
                </select>
              </div>
              <div>
                <label htmlFor="dashboard-metric" className="mb-2 block text-xs font-bold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
                  Metric
                </label>
                <select id="dashboard-metric" name="dashboard_metric" aria-label="Dashboard metric"
                  value={metric}
                  onChange={(event) => setMetric(event.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white/80 px-4 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900/80"
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
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:flex lg:justify-end">
              {(isDoctor || isNurse) && (
                <>
                  <button
                    onClick={toggleLiveMonitoring}
                    className={`clinical-button relative h-11 w-full whitespace-nowrap rounded-xl px-5 text-sm font-bold text-white shadow-lg xl:w-auto ${
                      liveMonitoring
                        ? "bg-red-600 shadow-red-500/25 hover:bg-red-700"
                        : "bg-green-600 shadow-green-500/25 hover:bg-green-700"
                    } ${liveMonitoring ? "live-pulse" : ""}`}
                  >
                    {liveMonitoring ? "Stop WebSocket Stream" : "Start WebSocket Stream"}
                  </button>

                  {isDoctor && (
                    <ClinicianPdfReportButton
                      patient={selectedPatient}
                      vitals={patientData}
                    />
                  )}
                </>
              )}

              <button
                onClick={exportPDF}
                className="clinical-button h-11 w-full whitespace-nowrap rounded-xl border border-slate-200 bg-white/80 px-5 text-sm font-bold shadow-sm hover:bg-white dark:border-slate-700 dark:bg-slate-900/80 xl:w-auto"
              >
                Export Dashboard PDF
              </button>
            </div>
          </div>

          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
            Showing analytics for{" "}
            <strong className="text-slate-800 dark:text-white">
              {selectedPatient.name}
            </strong>{" "}
            — {selectedPatient.condition}
          </p>

          {liveMonitoring && (
            <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700 dark:border-green-900/60 dark:bg-green-950/30 dark:text-green-400">
              WebSocket stream is active. New vitals are coming from the
              FastAPI backend every few seconds and saved to PostgreSQL.
            </div>
          )}
        </section>

        <WithingsIntegration patientId={selectedPatient.id} />

        {(isDoctor || isNurse) && (
          <section id="live-monitoring" className="scroll-mt-28">
            <WebSocketLivePanel
              connected={socketConnected}
              latestRecord={latestSocketRecord}
            />
          </section>
        )}

        {isDoctor && (
          <section id="activity-feed" className="scroll-mt-28">
            <DatabaseActivityFeed />
          </section>
        )}

        <section id="ai-assistant" className="scroll-mt-28">
          <HealthAIAssistant patientId={selectedPatient.id} />
        </section>

        <section
          id="prediction"
          className={`grid gap-6 scroll-mt-28 ${
            isPatient ? "xl:grid-cols-1" : "xl:grid-cols-2"
          }`}
        >
          <MLPredictionPanel patientId={selectedPatient.id} />

          {isDoctor && (
            <LinearRegressionPanel patientId={selectedPatient.id} />
          )}
        </section>

        <section id="medication-adherence" className="scroll-mt-28">
          <MedicationAdherenceDatabase
            patientId={selectedPatient.id}
            canAddMedication={isNurse}
            canUpdateStatus={isNurse}
          />
        </section>

        <section id="patient-timeline" className="scroll-mt-28">
          <PatientTimelineDatabase
            patientId={selectedPatient.id}
            canAddEvent={isDoctor || isNurse}
            defaultEventType={isNurse ? "Nursing Note" : "Clinical Note"}
            defaultTitle={isNurse ? "Nursing note added" : "Clinical note added"}
          />
        </section>

        {isDoctor && (
          <section id="clinician-activity" className="scroll-mt-28">
            <ClinicianActivityFeed
              alertsCount={alerts.length}
              queueCount={clinicianQueue.length}
            />
          </section>
        )}

        {isDoctor && (
          <section id="ai-insights" className="scroll-mt-28">
            <AIInsightPanel insight={insight} onGenerate={generateInsight} />
          </section>
        )}

        {isDoctor && (
          <section id="predictive-risk" className="grid gap-6 xl:grid-cols-2 scroll-mt-28">
            <PredictiveRiskPanel prediction={prediction} />
            <MedicationPanel patientId={selectedPatient.id} />
          </section>
        )}

        {isDoctor && (
          <section id="reports" className="scroll-mt-28">
            <AIClinicianReport report={clinicianReport} />
          </section>
        )}

        <section id="stats" className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-5 scroll-mt-28">
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
            description={
              stats.avgSleep < 7 ? "Below recommended" : "Healthy range"
            }
            status={
              stats.avgSleep < 6
                ? "alert"
                : stats.avgSleep < 7
                ? "warning"
                : "good"
            }
          />
        </section>

        <section id="alerts" className="scroll-mt-28">
          <AlertPanel alerts={alerts} />
        </section>

        {isDoctor && (
          <section id="review-queue" className="scroll-mt-28">
            <ClinicianQueue queue={clinicianQueue} />
          </section>
        )}

        {isDoctor && (
          <section id="ai-explanation" className="scroll-mt-28">
            <AIExplanationPanel
              reasons={aiAnalysis.reasons}
              riskLevel={aiAnalysis.riskLevel}
            />
          </section>
        )}

        <section id="trend-analysis" className="scroll-mt-28">
          <TrendAnalysisPanel trends={trends} />
        </section>

        {isDoctor && (
          <section id="patient-timeline-local" className="scroll-mt-28">
            <PatientTimeline records={patientData} />
          </section>
        )}

        <section id="vitals" className="dashboard-grid scroll-mt-28">
          <div className="col-span-12 xl:col-span-4">
            <HealthScoreGauge score={healthScore} />
          </div>

          <HealthCharts data={filteredData} metric={metric} />
        </section>

        <section id="data-table" className="scroll-mt-28">
          <DataTable data={filteredData} />
        </section>
      </div>

      <PatientDetailModal
        patient={selectedPatient}
        records={patientData}
        open={patientModalOpen}
        onClose={() => setPatientModalOpen(false)}
      />
    </>
  );
}
