import type { HealthData } from "../data/healthData";
import type { Patient } from "../../types/patient";
import type { PatientBaseline } from "./baseline";

export type RiskLevel = "Low" | "Moderate" | "High" | "Critical";

export type RiskResult = {
  riskScore: number;
  riskLevel: RiskLevel;
  anomalyDetected: boolean;
  notifyUser: boolean;
  notifyClinician: boolean;
  reasons: string[];
  advice: string[];
};

function percentageDifference(current: number, baseline: number) {
  if (baseline === 0) return 0;
  return ((current - baseline) / baseline) * 100;
}

export function calculateRiskScore(
  record: Omit<HealthData, "riskScore">,
  patient: Patient,
  baseline?: PatientBaseline
): RiskResult {
  let score = 0;
  const reasons: string[] = [];
  const advice: string[] = [];

  const condition = patient.condition.toLowerCase();

  if (!baseline?.isReady) {
    return {
      riskScore: 1,
      riskLevel: "Low",
      anomalyDetected: false,
      notifyUser: false,
      notifyClinician: false,
      reasons: [
        `Baseline learning in progress. ${baseline?.recordsUsed ?? 0}/5 resting records collected.`,
      ],
      advice: [
        "Collect at least five resting readings before relying on personalised risk analysis.",
      ],
    };
  }

  const hrDeviation = percentageDifference(record.heartRate, baseline.avgHeartRate);
  const spo2Deviation = percentageDifference(record.spo2, baseline.avgSpo2);
  const systolicDeviation = percentageDifference(record.systolicBP, baseline.avgSystolicBP);
  const sleepDeviation = percentageDifference(record.sleepHours, baseline.avgSleepHours);

  if (record.activityState === "resting" && hrDeviation > 40) {
    score += 4;
    reasons.push("Resting heart rate is more than 40% above personal baseline.");
    advice.push("Sit down, rest, hydrate, and avoid physical activity.");
  } else if (hrDeviation > 25) {
    score += 2;
    reasons.push("Heart rate is significantly above personal baseline.");
  }

  if (record.spo2 < 92) {
    score += 5;
    reasons.push("Blood oxygen level is critically low.");
    advice.push("Seek urgent medical advice if oxygen remains low or breathing feels difficult.");
  } else if (record.spo2 < 95 || spo2Deviation < -5) {
    score += 2;
    reasons.push("Blood oxygen level is below expected personal or clinical range.");
  }

  if (record.systolicBP >= 160 || record.diastolicBP >= 100) {
    score += 5;
    reasons.push("Blood pressure is dangerously elevated.");
    advice.push("Rest and recheck blood pressure. Clinician review may be required.");
  } else if (record.systolicBP >= 140 || record.diastolicBP >= 90 || systolicDeviation > 20) {
    score += 3;
    reasons.push("Blood pressure is elevated compared with baseline or clinical threshold.");
  }

  if (sleepDeviation < -30 || record.sleepHours < 5) {
    score += 2;
    reasons.push("Sleep recovery is significantly below personal baseline.");
    advice.push("Prioritise rest and monitor recovery trends.");
  }

  if (condition.includes("hypertension") && record.systolicBP > 130) {
    score += 2;
    reasons.push("Hypertension history increases concern from elevated blood pressure.");
  }

  if (condition.includes("heart") && record.heartRate > baseline.avgHeartRate * 1.25) {
    score += 2;
    reasons.push("Heart condition combined with elevated heart rate increases risk.");
  }

  if (condition.includes("asthma") && record.spo2 < 95) {
    score += 2;
    reasons.push("Asthma history combined with reduced oxygen level increases risk.");
  }

  if (condition.includes("diabetes") && record.steps < baseline.avgSteps * 0.5) {
    score += 1;
    reasons.push("Activity is much lower than baseline, which may affect diabetic health risk.");
  }

  const riskScore = Math.max(1, Math.min(10, score));

  const riskLevel: RiskLevel =
    riskScore >= 9 ? "Critical" :
    riskScore >= 7 ? "High" :
    riskScore >= 4 ? "Moderate" :
    "Low";

  return {
    riskScore,
    riskLevel,
    anomalyDetected: reasons.length > 0,
    notifyUser: riskScore >= 4,
    notifyClinician: riskScore >= 7,
    reasons,
    advice,
  };
}