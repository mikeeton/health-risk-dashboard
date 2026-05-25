import type { HealthData } from "../data/healthData";
import type { Patient } from "../../types/patient";
import type { PredictionResult } from "./predictiveRisk";

export function generateClinicianReport(
  patient: Patient,
  records: HealthData[],
  prediction: PredictionResult
) {
  const latest = records[records.length - 1];

  if (!latest) {
    return `No clinical report available for ${patient.name}. There are no vital records yet.`;
  }

  const highRiskReadings = records.filter((record) => record.riskScore >= 7);

  return `
Clinical Summary for ${patient.name}

Patient Profile:
${patient.name} is a ${patient.age}-year-old patient with ${patient.condition}.

Latest Reading:
Heart Rate: ${latest.heartRate} bpm
SpO₂: ${latest.spo2}%
Blood Pressure: ${latest.systolicBP}/${latest.diastolicBP}
Risk Score: ${latest.riskScore}/10
Activity State: ${latest.activityState}

Predictive Deterioration:
Current predictive deterioration score is ${prediction.score}/10.
Risk level: ${prediction.level}.
${prediction.message}

Clinical Interpretation:
${highRiskReadings.length > 0
  ? `There are ${highRiskReadings.length} high-risk readings in the recent record set. This suggests the patient may require closer observation.`
  : "There are no repeated high-risk readings in the current record set."}

Recommended Action:
${prediction.level === "Critical"
  ? "Urgent clinical review is recommended. Consider escalation if abnormal readings persist."
  : prediction.level === "High"
  ? "Clinician review is recommended. Repeat vitals and assess symptoms."
  : prediction.level === "Moderate"
  ? "Continue monitoring and advise the patient to follow normal care guidance."
  : "Continue routine monitoring."}
`.trim();
}