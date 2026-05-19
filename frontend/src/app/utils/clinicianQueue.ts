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

    const latest =
      patientRecords[
        patientRecords.length - 1
      ];

    const baseline =
      calculateBaseline(patientRecords);

    const risk =
      calculateRiskScore(
        latest,
        patient,
        baseline
      );

    if (
      risk.riskLevel === "High" ||
      risk.riskLevel === "Critical"
    ) {
      queue.push({
        patientId: patient.id,

        patientName: patient.name,

        condition: patient.condition,

        riskLevel: risk.riskLevel,

        riskScore: risk.riskScore,

        requiresImmediateAttention:
          risk.riskLevel === "Critical",

        reasons: risk.reasons,

        latestTimestamp:
          latest.timestamp,
      });
    }
  }

  return queue.sort(
    (a, b) =>
      b.riskScore - a.riskScore
  );
}