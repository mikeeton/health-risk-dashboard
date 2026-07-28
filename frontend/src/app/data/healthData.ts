export type ActivityState =
  | "resting"
  | "walking"
  | "running"
  | "sleeping"
  | "withings_device"
  | "condition_based_simulator";

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
  source?: "simulator" | "withings" | "manual";
  persisted?: boolean;
};

export const healthData: HealthData[] = [
  {
    id: "sarah-1",
    patientId: 1,
    timestamp: "2026-05-01 08:00",
    heartRate: 86,
    spo2: 96,
    systolicBP: 138,
    diastolicBP: 88,
    steps: 5200,
    sleepHours: 6.1,
    activeMinutes: 28,
    calories: 1900,
    riskScore: 5,
    activityState: "resting",
  },
  {
    id: "sarah-2",
    patientId: 1,
    timestamp: "2026-05-02 08:00",
    heartRate: 91,
    spo2: 95,
    systolicBP: 145,
    diastolicBP: 92,
    steps: 4700,
    sleepHours: 5.8,
    activeMinutes: 22,
    calories: 1850,
    riskScore: 7,
    activityState: "resting",
  },
  {
    id: "david-1",
    patientId: 2,
    timestamp: "2026-05-01 09:00",
    heartRate: 82,
    spo2: 97,
    systolicBP: 130,
    diastolicBP: 84,
    steps: 6400,
    sleepHours: 6.7,
    activeMinutes: 35,
    calories: 2100,
    riskScore: 4,
    activityState: "walking",
  },
  {
    id: "david-2",
    patientId: 2,
    timestamp: "2026-05-02 09:00",
    heartRate: 88,
    spo2: 96,
    systolicBP: 136,
    diastolicBP: 86,
    steps: 5900,
    sleepHours: 6.2,
    activeMinutes: 30,
    calories: 2050,
    riskScore: 5,
    activityState: "walking",
  },
  {
    id: "amina-1",
    patientId: 3,
    timestamp: "2026-05-01 10:00",
    heartRate: 76,
    spo2: 98,
    systolicBP: 118,
    diastolicBP: 76,
    steps: 8700,
    sleepHours: 7.4,
    activeMinutes: 50,
    calories: 2200,
    riskScore: 2,
    activityState: "walking",
  },
  {
    id: "amina-2",
    patientId: 3,
    timestamp: "2026-05-02 10:00",
    heartRate: 79,
    spo2: 96,
    systolicBP: 120,
    diastolicBP: 78,
    steps: 8100,
    sleepHours: 7.1,
    activeMinutes: 45,
    calories: 2150,
    riskScore: 3,
    activityState: "resting",
  },
  {
    id: "james-1",
    patientId: 4,
    timestamp: "2026-05-01 08:30",
    heartRate: 98,
    spo2: 94,
    systolicBP: 150,
    diastolicBP: 94,
    steps: 3100,
    sleepHours: 5.3,
    activeMinutes: 14,
    calories: 1750,
    riskScore: 8,
    activityState: "resting",
  },
  {
    id: "james-2",
    patientId: 4,
    timestamp: "2026-05-02 08:30",
    heartRate: 106,
    spo2: 92,
    systolicBP: 158,
    diastolicBP: 98,
    steps: 2600,
    sleepHours: 4.8,
    activeMinutes: 10,
    calories: 1700,
    riskScore: 9,
    activityState: "resting",
  },
];
