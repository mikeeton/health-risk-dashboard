import { useState } from "react";
import { FileDown } from "lucide-react";

import type { Patient } from "../../types/patient";
import type { HealthData } from "../data/healthData";

import {
  getAIPatientSummary,
  getMedications,
  getMLPrediction,
  getPatientEvents,
} from "../services/api";

type Props = {
  patient: Patient;
  vitals: HealthData[];
};

export default function ClinicianPdfReportButton({ patient, vitals }: Props) {
  const [loading, setLoading] = useState(false);

  const downloadReport = async () => {
    try {
      setLoading(true);

      const [medications, events, prediction, aiSummary] =
        await Promise.allSettled([
          getMedications(patient.id),
          getPatientEvents(patient.id),
          getMLPrediction(patient.id),
          getAIPatientSummary(patient.id),
        ]);

      const { generateClinicianPdfReport } = await import(
        "../utils/clinicianPdfReport"
      );

      generateClinicianPdfReport({
        patient,
        vitals,
        medications:
          medications.status === "fulfilled" ? medications.value : [],
        events: events.status === "fulfilled" ? events.value : [],
        prediction:
          prediction.status === "fulfilled" ? prediction.value : null,
        aiSummary:
          aiSummary.status === "fulfilled"
            ? aiSummary.value.summary
            : "AI summary unavailable.",
      });
    } catch (error) {
      console.error("Failed to generate clinician PDF:", error);
      alert("Failed to generate clinician PDF report.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={downloadReport}
      disabled={loading}
      className="clinical-button flex h-11 w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-blue-600 px-5 text-sm font-bold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700 disabled:opacity-60 xl:w-auto"
    >
      <FileDown className="h-4 w-4" />
      {loading ? "Generating PDF..." : "Download Clinician PDF"}
    </button>
  );
}
