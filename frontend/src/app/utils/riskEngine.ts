import type { HealthData } from "../data/healthData";
import type { Patient } from "../../types/patient";
import type { PatientBaseline } from "./baseline";

export type RiskResult = {
  riskScore: number;

  riskLevel:
    | "Low"
    | "Moderate"
    | "High"
    | "Critical";

  anomalyDetected: boolean;

  reasons: string[];
};

function percentageDifference(
  current: number,
  baseline: number
) {
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

  // ------------------------------------
  // HEART RATE ANALYSIS
  // ------------------------------------

  if (baseline) {
    const hrDeviation = percentageDifference(
      record.heartRate,
      baseline.avgHeartRate
    );

    if (
      hrDeviation > 40 &&
      record.activityState === "resting"
    ) {
      score += 4;

      reasons.push(
        "Heart rate is critically above personal baseline"
      );
    } else if (hrDeviation > 25) {
      score += 2;

      reasons.push(
        "Heart rate is significantly above normal baseline"
      );
    }

    if (hrDeviation < -25) {
      score += 2;

      reasons.push(
        "Heart rate is significantly below personal baseline"
      );
    }
  }

  // Fallback global thresholds
  if (
    record.heartRate > 120 &&
    record.activityState === "resting"
  ) {
    score += 3;

    reasons.push(
      "Resting heart rate is medically elevated"
    );
  }

  // ------------------------------------
  // OXYGEN ANALYSIS
  // ------------------------------------

  if (baseline) {
    const spo2Deviation = percentageDifference(
      record.spo2,
      baseline.avgSpo2
    );

    if (spo2Deviation < -5) {
      score += 3;

      reasons.push(
        "Blood oxygen level dropped below personal baseline"
      );
    }
  }

  if (record.spo2 < 92) {
    score += 4;

    reasons.push(
      "Blood oxygen is critically low"
    );
  } else if (record.spo2 < 95) {
    score += 2;

    reasons.push(
      "Blood oxygen level is below healthy range"
    );
  }

  // ------------------------------------
  // BLOOD PRESSURE ANALYSIS
  // ------------------------------------

  if (baseline) {
    const systolicDeviation =
      percentageDifference(
        record.systolicBP,
        baseline.avgSystolicBP
      );

    if (systolicDeviation > 20) {
      score += 3;

      reasons.push(
        "Blood pressure significantly exceeds personal baseline"
      );
    }
  }

  if (
    record.systolicBP >= 160 ||
    record.diastolicBP >= 100
  ) {
    score += 4;

    reasons.push(
      "Blood pressure is dangerously elevated"
    );
  } else if (
    record.systolicBP >= 140 ||
    record.diastolicBP >= 90
  ) {
    score += 2;

    reasons.push(
      "Blood pressure suggests hypertension risk"
    );
  }

  // ------------------------------------
  // SLEEP ANALYSIS
  // ------------------------------------

  if (baseline) {
    const sleepDeviation =
      percentageDifference(
        record.sleepHours,
        baseline.avgSleepHours
      );

    if (sleepDeviation < -30) {
      score += 2;

      reasons.push(
        "Sleep duration significantly below personal baseline"
      );
    }
  }

  if (record.sleepHours < 5) {
    score += 2;

    reasons.push(
      "Sleep duration critically low"
    );
  }

  // ------------------------------------
  // ACTIVITY ANALYSIS
  // ------------------------------------

  if (baseline) {
    const stepsDeviation =
      percentageDifference(
        record.steps,
        baseline.avgSteps
      );

    if (stepsDeviation < -50) {
      score += 1;

      reasons.push(
        "Physical activity sharply reduced compared to baseline"
      );
    }
  }

  // ------------------------------------
  // CONDITION-SPECIFIC RISK
  // ------------------------------------

  const condition =
    patient.condition.toLowerCase();

  if (
    condition.includes("hypertension") &&
    record.systolicBP > 130
  ) {
    score += 2;

    reasons.push(
      "Existing hypertension increases cardiovascular risk"
    );
  }

  if (
    condition.includes("heart") &&
    record.heartRate > 95
  ) {
    score += 2;

    reasons.push(
      "Heart condition combined with elevated heart rate"
    );
  }

  if (
    condition.includes("asthma") &&
    record.spo2 < 95
  ) {
    score += 2;

    reasons.push(
      "Asthma combined with oxygen reduction"
    );
  }

  if (
    condition.includes("diabetes") &&
    record.steps < 4000
  ) {
    score += 1;

    reasons.push(
      "Low activity may worsen diabetic health risk"
    );
  }

  // ------------------------------------
  // FINAL SCORE
  // ------------------------------------

  const riskScore = Math.max(
    1,
    Math.min(10, score)
  );

  const riskLevel =
    riskScore >= 9
      ? "Critical"
      : riskScore >= 7
      ? "High"
      : riskScore >= 4
      ? "Moderate"
      : "Low";

  return {
    riskScore,

    riskLevel,

    anomalyDetected:
      reasons.length > 0,

    reasons,
  };
}