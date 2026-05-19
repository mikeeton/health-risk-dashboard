import type { HealthData } from "../data/healthData";
import type { Patient } from "../../types/patient";
import { calculateRiskScore } from "./riskEngine";
import { calculateBaseline } from "./baseline";

export type AlertSeverity = "info" | "warning" | "high" | "critical";

export type HealthAlert = {
  id: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  timestamp: string;
  target: "user" | "clinician";
};

export function generateAlerts(data: HealthData[], patient?: Patient): HealthAlert[] {
  if (data.length === 0 || !patient) return [];

  const latest = data[data.length - 1];
  const baseline = calculateBaseline(data);
  const risk = calculateRiskScore(latest, patient, baseline);

  if (!baseline.isReady) {
    return [
      {
        id: crypto.randomUUID(),
        severity: "info",
        title: "Baseline Learning",
        message: `${baseline.recordsUsed}/5 resting baseline records collected. Personalised monitoring will improve after five resting readings.`,
        timestamp: latest.timestamp,
        target: "user",
      },
    ];
  }

  const alerts: HealthAlert[] = [];

  if (risk.notifyUser) {
    alerts.push({
      id: crypto.randomUUID(),
      severity:
        risk.riskLevel === "Critical" ? "critical" :
        risk.riskLevel === "High" ? "high" :
        "warning",
      title: `${risk.riskLevel} Health Warning`,
      message: risk.advice[0] ?? risk.reasons[0] ?? "Abnormal health pattern detected.",
      timestamp: latest.timestamp,
      target: "user",
    });
  }

  if (risk.notifyClinician) {
    alerts.push({
      id: crypto.randomUUID(),
      severity: risk.riskLevel === "Critical" ? "critical" : "high",
      title: "Clinician Review Recommended",
      message: `Patient ${patient.name} has a ${risk.riskLevel.toLowerCase()} AI risk score. Reasons: ${risk.reasons.join(" ")}`,
      timestamp: latest.timestamp,
      target: "clinician",
    });
  }

  return alerts;
}