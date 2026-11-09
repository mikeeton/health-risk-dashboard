export type UserRole = "admin" | "doctor" | "nurse" | "patient";

export type AuthUser = {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
};

export type LoginRequest = {
  email: string;
  password: string;
  mfa_code?: string | null;
};

export type TokenResponse = {
  access_token: string;
  refresh_token?: string | null;
  csrf_token?: string | null;
  token_type: "bearer";
  user: AuthUser;
};

export type PatientRecord = {
  id: number;
  user_id: number | null;
  primary_doctor_id: number | null;
  assigned_nurse_id: number | null;
  name: string;
  age: number;
  condition: string;
  risk_level: RiskLevel;
  last_checkup: string;
};

export type PatientCreateRequest = Omit<PatientRecord, "id">;

export type VitalRecord = {
  id: number;
  patient_id: number;
  timestamp: string;
  heart_rate: number;
  spo2: number;
  systolic_bp: number;
  diastolic_bp: number;
  steps: number;
  sleep_hours: number;
  active_minutes: number;
  calories: number;
  risk_score: number;
  activity_state: HealthData["activityState"];
  source: HealthData["source"];
  verification_status: string;
};

export type VitalCreateRequest = Omit<VitalRecord, "id" | "verification_status">;

export type ReviewCaseCreateRequest = {
  patient_id: number;
  patient_name: string;
  risk_level: string;
  risk_score: number;
  note: string;
};

export type ReviewCaseUpdateRequest = {
  status: string;
  note: string;
};

export type ReviewCaseRecord = ReviewCaseCreateRequest & {
  id: number;
  status: string;
  created_at: string;
  updated_at: string | null;
};
import type { HealthData } from "../data/healthData";
import type { RiskLevel } from "../../types/patient";
