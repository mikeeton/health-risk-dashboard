import type { HealthData } from "../data/healthData";

export type PredictionResult = {
  score: number;
  level: "Low" | "Moderate" | "High" | "Critical";
  message: string;
};

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function predictDeteriorationRisk(data: HealthData[]): PredictionResult {
  if (data.length < 4) {
    return {
      score: 1,
      level: "Low",
      message: "Not enough records for predictive deterioration scoring.",
    };
  }

  const recent = data.slice(-5);

  const avgRisk = average(recent.map((item) => item.riskScore));
  const avgSpo2 = average(recent.map((item) => item.spo2));
  const avgSleep = average(recent.map((item) => item.sleepHours));
  const avgSystolic = average(recent.map((item) => item.systolicBP));
  const avgHeart = average(recent.map((item) => item.heartRate));

  let score = avgRisk;

  if (avgSpo2 < 94) score += 2;
  if (avgSleep < 6) score += 1;
  if (avgSystolic > 145) score += 2;
  if (avgHeart > 100) score += 1;

  const finalScore = Math.max(1, Math.min(10, Math.round(score)));

  const level =
    finalScore >= 9 ? "Critical" :
    finalScore >= 7 ? "High" :
    finalScore >= 4 ? "Moderate" :
    "Low";

  return {
    score: finalScore,
    level,
    message:
      level === "Critical"
        ? "Patient shows strong signs of possible deterioration."
        : level === "High"
        ? "Patient may be trending toward clinical instability."
        : level === "Moderate"
        ? "Some deterioration indicators are present."
        : "No strong deterioration pattern detected.",
  };
}