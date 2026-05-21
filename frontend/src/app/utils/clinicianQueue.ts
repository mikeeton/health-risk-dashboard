import type { Patient } from "../../types/patient";
import type { HealthData } from "../data/healthData";

import { calculateBaseline } from "./baseline";
import { calculateRiskScore } from "./riskEngine";

export type ClinicianCase = {
  patientId: number;
  patientName: string;
  condition: string;
  riskLevel: string;
  riskScore: number;
  requiresImmediateAttention: boolean;
  reasons: string[];
  latestTimestamp: string;
};

export function buildClinicianQueue(
  patients: Patient[],
  healthData: HealthData[]
): ClinicianCase[] {
  const queue: ClinicianCase[] = [];

  for (const patient of patients) {
    const patientRecords = healthData.filter(
      (record) => record.patientId === patient.id
    );

    if (patientRecords.length === 0) continue;

    const latest = patientRecords[patientRecords.length - 1];

    const baseline = calculateBaseline(patientRecords);

    const risk = calculateRiskScore(latest, patient, baseline);

    const fallbackRiskScore = latest.riskScore;

    const finalRiskScore = Math.max(risk.riskScore, fallbackRiskScore);

    const finalRiskLevel =
      finalRiskScore >= 9
        ? "Critical"
        : finalRiskScore >= 7
        ? "High"
        : finalRiskScore >= 4
        ? "Moderate"
        : "Low";

    if (finalRiskLevel === "High" || finalRiskLevel === "Critical") {
      queue.push({
        patientId: patient.id,
        patientName: patient.name,
        condition: patient.condition,
        riskLevel: finalRiskLevel,
        riskScore: finalRiskScore,
        requiresImmediateAttention: finalRiskLevel === "Critical",
        reasons:
          risk.reasons.length > 0
            ? risk.reasons
            : [
                "High risk score detected from latest vital record.",
                "Clinician review recommended.",
              ],
        latestTimestamp: latest.timestamp,
      });
    }
  }

  return queue.sort((a, b) => b.riskScore - a.riskScore);
}