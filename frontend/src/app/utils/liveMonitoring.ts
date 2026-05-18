import type { HealthData } from "../data/healthData";
import type { PatientBaseline } from "./baseline";

function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function randomChance(chance: number) {
  return Math.random() < chance;
}

export function generateLiveHealthRecord(
  patientId: number,
  baseline: PatientBaseline
): HealthData {
  let heartRate = Math.round(
    baseline.avgHeartRate + randomBetween(-6, 6)
  );

  let spo2 = Number(
    (
      baseline.avgSpo2 +
      randomBetween(-1.5, 1.5)
    ).toFixed(1)
  );

  let systolicBP = Math.round(
    baseline.avgSystolicBP +
      randomBetween(-8, 8)
  );

  let diastolicBP = Math.round(
    baseline.avgDiastolicBP +
      randomBetween(-5, 5)
  );

  let sleepHours = Number(
    (
      baseline.avgSleepHours +
      randomBetween(-1, 1)
    ).toFixed(1)
  );

  let steps = Math.round(
    baseline.avgSteps +
      randomBetween(-1500, 1500)
  );

  let activeMinutes = Math.round(
    randomBetween(15, 90)
  );

  let calories = Math.round(
    randomBetween(1700, 2800)
  );

  let activityState:
    | "resting"
    | "walking"
    | "running"
    | "sleeping" = "resting";

  // ------------------------------------
  // RANDOM ACTIVITY STATE
  // ------------------------------------

  const states = [
    "resting",
    "walking",
    "running",
    "sleeping",
  ] as const;

  activityState =
    states[
      Math.floor(
        Math.random() * states.length
      )
    ];

  // ------------------------------------
  // OCCASIONAL ANOMALIES
  // ------------------------------------

  if (randomChance(0.12)) {
    heartRate += randomBetween(25, 50);

    systolicBP += randomBetween(15, 30);

    spo2 -= randomBetween(3, 7);
  }

  if (
    activityState === "sleeping"
  ) {
    heartRate -= 10;

    steps = 0;

    activeMinutes = 0;
  }

  if (
    activityState === "running"
  ) {
    heartRate += 20;

    steps += 3000;

    activeMinutes += 20;
  }

  return {
    id: crypto.randomUUID(),

    patientId,

    timestamp:
      new Date().toISOString(),

    heartRate: Math.round(
      heartRate
    ),

    spo2: Number(
      Math.max(
        85,
        Math.min(100, spo2)
      ).toFixed(1)
    ),

    systolicBP: Math.round(
      systolicBP
    ),

    diastolicBP: Math.round(
      diastolicBP
    ),

    sleepHours: Math.max(
      0,
      sleepHours
    ),

    activeMinutes,

    calories,

    steps: Math.max(0, steps),

    riskScore: 0,

    activityState,
  };
}