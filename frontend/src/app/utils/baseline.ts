import type { HealthData } from "../data/healthData";

export type PatientBaseline = {
  isReady: boolean;
  recordsUsed: number;
  avgHeartRate: number;
  avgSpo2: number;
  avgSystolicBP: number;
  avgDiastolicBP: number;
  avgSleepHours: number;
  avgSteps: number;
};

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function calculateBaseline(data: HealthData[]): PatientBaseline {
  const restingRecords = data
    .filter((record) => record.activityState === "resting")
    .slice(0, 5);

  return {
    isReady: restingRecords.length >= 5,
    recordsUsed: restingRecords.length,
    avgHeartRate: Math.round(average(restingRecords.map((r) => r.heartRate))),
    avgSpo2: Number(average(restingRecords.map((r) => r.spo2)).toFixed(1)),
    avgSystolicBP: Math.round(average(restingRecords.map((r) => r.systolicBP))),
    avgDiastolicBP: Math.round(average(restingRecords.map((r) => r.diastolicBP))),
    avgSleepHours: Number(average(restingRecords.map((r) => r.sleepHours)).toFixed(1)),
    avgSteps: Math.round(average(restingRecords.map((r) => r.steps))),
  };
}