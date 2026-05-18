import { mockPatients } from "../data/mockPatients";
import type { Patient } from "../../types/patient";

export function getPatients(): Patient[] {
  return mockPatients;
}

export function getPatientStats() {
  const patients = getPatients();

  return {
    totalPatients: patients.length,
    highRisk: patients.filter((patient) => patient.riskLevel === "High").length,
    moderateRisk: patients.filter((patient) => patient.riskLevel === "Moderate").length,
    lowRisk: patients.filter((patient) => patient.riskLevel === "Low").length,
  };
}

export function getAiInsight(): string {
  const stats = getPatientStats();

  return `AI analysis shows that ${stats.highRisk} patient(s) are currently high risk and may require urgent review.`;
}