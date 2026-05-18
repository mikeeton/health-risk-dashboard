import type { HealthData } from "../data/healthData";

export type HealthTrend = {
  metric: string;

  direction:
    | "improving"
    | "stable"
    | "worsening";

  severity:
    | "low"
    | "moderate"
    | "high";

  message: string;
};

function percentageChange(
  oldValue: number,
  newValue: number
) {
  if (oldValue === 0) return 0;

  return (
    ((newValue - oldValue) / oldValue) * 100
  );
}

function average(values: number[]) {
  if (values.length === 0) return 0;

  return (
    values.reduce(
      (sum, value) => sum + value,
      0
    ) / values.length
  );
}

export function analyzeTrends(
  data: HealthData[]
): HealthTrend[] {
  if (data.length < 4) return [];

  const trends: HealthTrend[] = [];

  const midpoint = Math.floor(data.length / 2);

  const older = data.slice(0, midpoint);
  const newer = data.slice(midpoint);

  // ------------------------------------
  // HEART RATE TREND
  // ------------------------------------

  const oldHR = average(
    older.map((item) => item.heartRate)
  );

  const newHR = average(
    newer.map((item) => item.heartRate)
  );

  const hrChange = percentageChange(
    oldHR,
    newHR
  );

  if (hrChange > 15) {
    trends.push({
      metric: "Heart Rate",
      direction: "worsening",
      severity:
        hrChange > 30
          ? "high"
          : "moderate",

      message: `Heart rate has increased by ${hrChange.toFixed(
        1
      )}% over recent records.`,
    });
  } else if (hrChange < -10) {
    trends.push({
      metric: "Heart Rate",
      direction: "improving",
      severity: "low",

      message:
        "Heart rate trend appears to be stabilizing.",
    });
  }

  // ------------------------------------
  // OXYGEN TREND
  // ------------------------------------

  const oldSpo2 = average(
    older.map((item) => item.spo2)
  );

  const newSpo2 = average(
    newer.map((item) => item.spo2)
  );

  const spo2Change = percentageChange(
    oldSpo2,
    newSpo2
  );

  if (spo2Change < -3) {
    trends.push({
      metric: "Oxygen",
      direction: "worsening",
      severity:
        spo2Change < -6
          ? "high"
          : "moderate",

      message:
        "Blood oxygen trend is gradually declining.",
    });
  }

  // ------------------------------------
  // BLOOD PRESSURE TREND
  // ------------------------------------

  const oldBP = average(
    older.map(
      (item) => item.systolicBP
    )
  );

  const newBP = average(
    newer.map(
      (item) => item.systolicBP
    )
  );

  const bpChange = percentageChange(
    oldBP,
    newBP
  );

  if (bpChange > 10) {
    trends.push({
      metric: "Blood Pressure",
      direction: "worsening",
      severity:
        bpChange > 20
          ? "high"
          : "moderate",

      message:
        "Blood pressure trend is increasing over time.",
    });
  }

  // ------------------------------------
  // SLEEP TREND
  // ------------------------------------

  const oldSleep = average(
    older.map(
      (item) => item.sleepHours
    )
  );

  const newSleep = average(
    newer.map(
      (item) => item.sleepHours
    )
  );

  const sleepChange =
    percentageChange(
      oldSleep,
      newSleep
    );

  if (sleepChange < -15) {
    trends.push({
      metric: "Sleep",
      direction: "worsening",
      severity:
        sleepChange < -30
          ? "high"
          : "moderate",

      message:
        "Sleep recovery trend is deteriorating.",
    });
  } else if (sleepChange > 10) {
    trends.push({
      metric: "Sleep",
      direction: "improving",
      severity: "low",

      message:
        "Sleep recovery trend is improving.",
    });
  }

  // ------------------------------------
  // ACTIVITY TREND
  // ------------------------------------

  const oldSteps = average(
    older.map((item) => item.steps)
  );

  const newSteps = average(
    newer.map((item) => item.steps)
  );

  const stepsChange =
    percentageChange(
      oldSteps,
      newSteps
    );

  if (stepsChange < -25) {
    trends.push({
      metric: "Activity",
      direction: "worsening",
      severity:
        stepsChange < -50
          ? "high"
          : "moderate",

      message:
        "Physical activity trend has reduced significantly.",
    });
  }

  return trends;
}