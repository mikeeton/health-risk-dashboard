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
  const safeHR = baseline.avgHeartRate || 75;
  const safeSpo2 = baseline.avgSpo2 || 97;
  const safeSys = baseline.avgSystolicBP || 120;
  const safeDia = baseline.avgDiastolicBP || 80;
  const safeSleep = baseline.avgSleepHours || 7;
  const safeSteps = baseline.avgSteps || 7000;

  const states = ["resting", "walking", "running", "sleeping"] as const;
  let activityState: HealthData["activityState"] =
    states[Math.floor(Math.random() * states.length)];

  let heartRate = Math.round(safeHR + randomBetween(-6, 6));
  let spo2 = Number((safeSpo2 + randomBetween(-1.2, 1.2)).toFixed(1));
  let systolicBP = Math.round(safeSys + randomBetween(-8, 8));
  const diastolicBP = Math.round(safeDia + randomBetween(-5, 5));
  const sleepHours = Number((safeSleep + randomBetween(-0.8, 0.8)).toFixed(1));
  let steps = Math.round(safeSteps + randomBetween(-1200, 1200));
  let activeMinutes = Math.round(randomBetween(15, 80));
  const calories = Math.round(randomBetween(1700, 2600));

  if (activityState === "sleeping") {
    heartRate -= 10;
    steps = 0;
    activeMinutes = 0;
  }

  if (activityState === "running") {
    heartRate += 22;
    steps += 2500;
    activeMinutes += 20;
  }

  if (randomChance(0.12)) {
    heartRate += randomBetween(25, 50);
    systolicBP += randomBetween(15, 30);
    spo2 -= randomBetween(3, 7);
    activityState = "resting";
  }

  return {
    id: crypto.randomUUID(),
    patientId,
    timestamp: new Date().toISOString(),
    heartRate: Math.max(40, Math.round(heartRate)),
    spo2: Number(Math.max(85, Math.min(100, spo2)).toFixed(1)),
    systolicBP: Math.round(systolicBP),
    diastolicBP: Math.round(diastolicBP),
    sleepHours: Math.max(0, sleepHours),
    activeMinutes,
    calories,
    steps: Math.max(0, steps),
    riskScore: 0,
    activityState,
  };
}
