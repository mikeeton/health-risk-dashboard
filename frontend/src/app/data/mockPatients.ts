import type { Patient } from "../../types/patient";

export const mockPatients: Patient[] = [
  {
    id: 1,
    name: "Sarah Johnson",
    age: 72,
    condition: "Hypertension",
    riskLevel: "High",
    lastCheckup: "2026-04-28",
  },
  {
    id: 2,
    name: "David Smith",
    age: 58,
    condition: "Diabetes",
    riskLevel: "Moderate",
    lastCheckup: "2026-04-25",
  },
  {
    id: 3,
    name: "Amina Yusuf",
    age: 44,
    condition: "Asthma",
    riskLevel: "Low",
    lastCheckup: "2026-04-20",
  },
  {
    id: 4,
    name: "James Brown",
    age: 81,
    condition: "Heart Disease",
    riskLevel: "High",
    lastCheckup: "2026-04-18",
  },
];