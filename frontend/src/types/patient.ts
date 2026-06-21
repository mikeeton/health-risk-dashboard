export type RiskLevel = "Low" | "Moderate" | "High" | "Critical";

export type Patient = {
  id: number;
  userId?: number | null;
  primaryDoctorId?: number | null;
  assignedNurseId?: number | null;
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
