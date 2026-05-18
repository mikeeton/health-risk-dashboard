export type RiskLevel = "Low" | "Moderate" | "High";

export type Patient = {
  id: number;
  name: string;
  age: number;
  gender?: string;
  condition: string;
  riskLevel: RiskLevel;
  lastCheckup: string;
  doctorEmail?: string;
  emergencyContact?: string;
  wearableType?: string;
};