import type { HealthData } from "../data/healthData";

function average(values: number[]) {
  if (values.length === 0) return 0;

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function getDashboardStats(data: HealthData[]) {
  const avgHeartRate = average(data.map((item) => item.heartRate));

  const avgSpo2 = average(data.map((item) => item.spo2));

  const avgSleep = average(data.map((item) => item.sleepHours));

  const avgRisk = average(data.map((item) => item.riskScore));

  const avgSystolicBP = average(
    data.map((item) => item.systolicBP)
  );

  const avgDiastolicBP = average(
    data.map((item) => item.diastolicBP)
  );

  return {
    avgHeartRate: Math.round(avgHeartRate),

    avgSpo2: Number(avgSpo2.toFixed(1)),

    avgSleep: Number(avgSleep.toFixed(1)),

    avgRisk: Number(avgRisk.toFixed(1)),

    avgSystolicBP: Math.round(avgSystolicBP),

    avgDiastolicBP: Math.round(avgDiastolicBP),
  };
}

export function getHealthScore(data: HealthData[]) {
  if (data.length === 0) return 0;

  const stats = getDashboardStats(data);

  let score = 100;

  // Heart rate penalty
  if (stats.avgHeartRate > 100) score -= 20;
  else if (stats.avgHeartRate > 85) score -= 10;

  // Oxygen penalty
  if (stats.avgSpo2 < 92) score -= 25;
  else if (stats.avgSpo2 < 95) score -= 10;

  // Blood pressure penalty
  if (stats.avgSystolicBP > 140) score -= 20;
  else if (stats.avgSystolicBP > 130) score -= 10;

  // Sleep penalty
  if (stats.avgSleep < 5) score -= 20;
  else if (stats.avgSleep < 7) score -= 10;

  // Risk score penalty
  score -= stats.avgRisk * 3;

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function generateDynamicInsight(data: HealthData[]) {
  if (data.length === 0) {
    return "No health data available for analysis.";
  }

  const stats = getDashboardStats(data);

  const insights: string[] = [];

  // Heart Rate
  if (stats.avgHeartRate > 100) {
    insights.push(
      "Elevated average heart rate detected. Cardiovascular strain may be increasing."
    );
  } else if (stats.avgHeartRate < 55) {
    insights.push(
      "Average heart rate appears unusually low. Monitor for fatigue or dizziness."
    );
  } else {
    insights.push(
      "Heart rate trends remain within a relatively stable range."
    );
  }

  // Oxygen
  if (stats.avgSpo2 < 92) {
    insights.push(
      "Blood oxygen levels appear critically reduced. Respiratory monitoring is recommended."
    );
  } else if (stats.avgSpo2 < 95) {
    insights.push(
      "Mild oxygen reduction detected. Continue observation."
    );
  } else {
    insights.push(
      "Blood oxygen levels remain stable and healthy."
    );
  }

  // Blood Pressure
  if (stats.avgSystolicBP > 140) {
    insights.push(
      "Blood pressure readings indicate potential hypertension risk."
    );
  } else if (stats.avgSystolicBP > 130) {
    insights.push(
      "Blood pressure is slightly elevated above recommended levels."
    );
  } else {
    insights.push(
      "Blood pressure trends appear stable."
    );
  }

  // Sleep
  if (stats.avgSleep < 5) {
    insights.push(
      "Sleep duration is critically low and may affect recovery and stress levels."
    );
  } else if (stats.avgSleep < 7) {
    insights.push(
      "Sleep duration is slightly below recommended levels."
    );
  } else {
    insights.push(
      "Sleep duration appears healthy and consistent."
    );
  }

  // Risk score
  if (stats.avgRisk > 7) {
    insights.push(
      "Overall health risk score is high. Clinical review is strongly recommended."
    );
  } else if (stats.avgRisk > 4) {
    insights.push(
      "Moderate health risk trends detected."
    );
  } else {
    insights.push(
      "Overall risk profile currently appears low."
    );
  }

  return insights.join(" ");
}