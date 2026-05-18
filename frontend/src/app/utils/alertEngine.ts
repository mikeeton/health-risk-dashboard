import type { HealthData } from "../data/healthData";

export type AlertSeverity =
  | "info"
  | "warning"
  | "high"
  | "critical";

export type HealthAlert = {
  id: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  timestamp: string;
};

export function generateAlerts(
  data: HealthData[]
): HealthAlert[] {
  const alerts: HealthAlert[] = [];

  if (data.length === 0) return alerts;

  const latest = data[data.length - 1];

  if (
    latest.heartRate > 120 &&
    latest.activityState === "resting"
  ) {
    alerts.push({
      id: crypto.randomUUID(),
      severity: "critical",
      title: "Critical Heart Rate",
      message:
        "Resting heart rate is critically elevated. Immediate medical review may be required.",
      timestamp: latest.timestamp,
    });
  }

  if (latest.spo2 < 92) {
    alerts.push({
      id: crypto.randomUUID(),
      severity: "critical",
      title: "Low Oxygen Level",
      message:
        "Blood oxygen level has dropped below safe threshold.",
      timestamp: latest.timestamp,
    });
  }

  if (
    latest.systolicBP >= 160 ||
    latest.diastolicBP >= 100
  ) {
    alerts.push({
      id: crypto.randomUUID(),
      severity: "high",
      title: "Severe Hypertension Risk",
      message:
        "Blood pressure readings are dangerously elevated.",
      timestamp: latest.timestamp,
    });
  }

  if (latest.sleepHours < 5) {
    alerts.push({
      id: crypto.randomUUID(),
      severity: "warning",
      title: "Poor Sleep Recovery",
      message:
        "Sleep duration is critically low and may affect recovery.",
      timestamp: latest.timestamp,
    });
  }

  if (latest.steps < 3000) {
    alerts.push({
      id: crypto.randomUUID(),
      severity: "info",
      title: "Low Activity Level",
      message:
        "Low physical activity detected in recent records.",
      timestamp: latest.timestamp,
    });
  }

  if (latest.riskScore >= 9) {
    alerts.push({
      id: crypto.randomUUID(),
      severity: "critical",
      title: "Critical Health Risk",
      message:
        "AI risk engine classified patient as critical risk.",
      timestamp: latest.timestamp,
    });
  } else if (latest.riskScore >= 7) {
    alerts.push({
      id: crypto.randomUUID(),
      severity: "high",
      title: "High Health Risk",
      message:
        "AI risk engine detected significant health instability.",
      timestamp: latest.timestamp,
    });
  } else if (latest.riskScore >= 4) {
    alerts.push({
      id: crypto.randomUUID(),
      severity: "warning",
      title: "Moderate Health Risk",
      message:
        "Moderate health risk trends detected.",
      timestamp: latest.timestamp,
    });
  }

  return alerts;
}