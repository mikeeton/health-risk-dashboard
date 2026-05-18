import type { HealthData } from "../data/healthData";

export type PatientBaseline = {
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
  return {
    avgHeartRate: Math.round(average(data.map((item) => item.heartRate))),
    avgSpo2: Number(average(data.map((item) => item.spo2)).toFixed(1)),
    avgSystolicBP: Math.round(average(data.map((item) => item.systolicBP))),
    avgDiastolicBP: Math.round(average(data.map((item) => item.diastolicBP))),
    avgSleepHours: Number(average(data.map((item) => item.sleepHours)).toFixed(1)),
    avgSteps: Math.round(average(data.map((item) => item.steps))),
  };
}