export type ActivityState = "resting" | "walking" | "running" | "sleeping";

export type HealthData = {
  id: string;
  patientId: number;
  timestamp: string;
  heartRate: number;
  spo2: number;
  systolicBP: number;
  diastolicBP: number;
  steps: number;
  sleepHours: number;
  activeMinutes: number;
  calories: number;
  riskScore: number;
  activityState: ActivityState;
};

export const healthData: HealthData[] = [
  {
    id: "hr-1",
    patientId: 1,
    timestamp: "2026-03-01 08:00",
    heartRate: 78,
    spo2: 98,
    systolicBP: 120,
    diastolicBP: 80,
    steps: 8500,
    sleepHours: 7.2,
    activeMinutes: 45,
    calories: 2100,
    riskScore: 2,
    activityState: "resting",
  },
  {
    id: "hr-2",
    patientId: 1,
    timestamp: "2026-03-02 08:00",
    heartRate: 86,
    spo2: 96,
    systolicBP: 132,
    diastolicBP: 86,
    steps: 6200,
    sleepHours: 6.1,
    activeMinutes: 30,
    calories: 2000,
    riskScore: 5,
    activityState: "walking",
  },
  {
    id: "hr-3",
    patientId: 2,
    timestamp: "2026-03-01 09:00",
    heartRate: 102,
    spo2: 94,
    systolicBP: 145,
    diastolicBP: 92,
    steps: 4200,
    sleepHours: 5.2,
    activeMinutes: 18,
    calories: 1800,
    riskScore: 8,
    activityState: "resting",
  },
];