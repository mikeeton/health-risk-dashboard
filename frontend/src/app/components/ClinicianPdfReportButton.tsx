import { useState } from "react";
import { FileDown } from "lucide-react";

import type { Patient } from "../../types/patient";
import type { HealthData } from "../data/healthData";

import {
  getMedications,
  getPatientEvents,
  getMLPrediction,
} from "../services/api";

import { generateClinicianPdfReport } from "../utils/clinicianPdfReport";

type Props = {
  patient: Patient;
  vitals: HealthData[];
};

export default function ClinicianPdfReportButton({ patient, vitals }: Props) {
  const [loading, setLoading] = useState(false);

  const downloadReport = async () => {
    try {
      setLoading(true);

      const [medications, events, predictionResult] = await Promise.allSettled([
        getMedications(patient.id),
        getPatientEvents(patient.id),
        getMLPrediction(patient.id),
      ]);

      const medicationsData =
        medications.status === "fulfilled" ? medications.value : [];

      const eventsData = events.status === "fulfilled" ? events.value : [];

      const predictionData =
        predictionResult.status === "fulfilled" ? predictionResult.value : null;

      generateClinicianPdfReport({
        patient,
        vitals,
        medications: medicationsData,
        events: eventsData,
        prediction: predictionData,
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
      className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition hover:scale-[1.02] hover:bg-blue-700 disabled:opacity-60"
    >
      <FileDown className="h-4 w-4" />
      {loading ? "Generating PDF..." : "Download Clinician PDF"}
    </button>
  );
}