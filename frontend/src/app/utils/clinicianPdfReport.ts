import jsPDF from "jspdf";
import type { Patient } from "../../types/patient";
import type { HealthData } from "../data/healthData";

type Medication = {
  id: number;
  name: string;
  dosage: string;
  schedule_time: string;
  status: string;
  notes?: string | null;
};

type PatientEvent = {
  id: number;
  event_type: string;
  title: string;
  description?: string | null;
  timestamp: string;
};

type MLPrediction = {
  prediction_score: number;
  prediction_level: string;
  probability?: number;
  source?: string;
  message: string;
};

function avg(values: number[]) {
  if (!values.length) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function addText(doc: jsPDF, text: string, x: number, y: number, width = 170) {
  const lines = doc.splitTextToSize(text, width);
  doc.text(lines, x, y);
  return y + lines.length * 6;
}

function nextPageIfNeeded(doc: jsPDF, y: number) {
  if (y > 270) {
    doc.addPage();
    return 20;
  }

  return y;
}

function section(doc: jsPDF, title: string, y: number) {
  y = nextPageIfNeeded(doc, y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(title, 20, y);
  return y + 8;
}

export function generateClinicianPdfReport({
  patient,
  vitals,
  medications,
  events,
  prediction,
  aiSummary,
}: {
  patient: Patient;
  vitals: HealthData[];
  medications: Medication[];
  events: PatientEvent[];
  prediction: MLPrediction | null;
  aiSummary?: string;
}) {
  const doc = new jsPDF("p", "mm", "a4");
  const latest = vitals[vitals.length - 1];
  const recent = vitals.slice(-10);

  let y = 18;

  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, 210, 32, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Clinical Monitoring Report", 20, 18);

  doc.setFontSize(9);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 26);

  y = 44;

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");

  y = section(doc, "1. Patient Summary", y);
  y = addText(
    doc,
    `${patient.name}, age ${patient.age}. Condition: ${patient.condition}. Current recorded risk level: ${patient.riskLevel}. Last checkup: ${patient.lastCheckup}.`,
    20,
    y
  );

  y += 6;
  y = section(doc, "2. Vital Trends", y);

  if (!recent.length) {
    y = addText(doc, "No vital records available.", 20, y);
  } else {
    y = addText(
      doc,
      `Recent averages from ${recent.length} readings: HR ${avg(
        recent.map((item) => item.heartRate)
      )} bpm, SpO2 ${avg(recent.map((item) => item.spo2))}%, BP ${avg(
        recent.map((item) => item.systolicBP)
      )}/${avg(recent.map((item) => item.diastolicBP))}, Risk Score ${avg(
        recent.map((item) => item.riskScore)
      )}/10.`,
      20,
      y
    );

    if (latest) {
      y += 4;
      y = addText(
        doc,
        `Latest reading: HR ${latest.heartRate}, SpO2 ${latest.spo2}%, BP ${latest.systolicBP}/${latest.diastolicBP}, sleep ${latest.sleepHours}h, activity ${latest.activityState}, risk ${latest.riskScore}/10.`,
        20,
        y
      );
    }
  }

  y += 6;
  y = section(doc, "3. Medication Adherence", y);

  if (!medications.length) {
    y = addText(doc, "No medication records available.", 20, y);
  } else {
    medications.forEach((med) => {
      y = nextPageIfNeeded(doc, y);
      y = addText(
        doc,
        `• ${med.name} ${med.dosage} at ${med.schedule_time}. Status: ${med.status}.`,
        24,
        y,
        160
      );
    });
  }

  y += 6;
  y = section(doc, "4. Timeline Events", y);

  if (!events.length) {
    y = addText(doc, "No timeline events recorded.", 20, y);
  } else {
    events.slice(0, 8).forEach((event) => {
      y = nextPageIfNeeded(doc, y);
      y = addText(
        doc,
        `• ${event.event_type}: ${event.title} (${new Date(
          event.timestamp
        ).toLocaleString()}) ${event.description ?? ""}`,
        24,
        y,
        160
      );
    });
  }

  y += 6;
  y = section(doc, "5. Trained Six-Hour ML Prediction", y);

  if (!prediction) {
    y = addText(doc, "Prediction unavailable. At least 5 vital records may be required.", 20, y);
  } else {
    y = addText(
      doc,
      `Prediction score: ${prediction.prediction_score}/10. Level: ${prediction.prediction_level}. ${
        prediction.source === "versioned_model" && prediction.probability !== undefined
          ? `Predicted six-hour critical-event probability: ${(prediction.probability * 100).toFixed(1)}%.`
          : prediction.source === "deterministic_safety_override"
            ? "Safety Rules triggered; model probability was not calculated."
            : "Calculated fallback; no trained-model probability is available."
      } ${prediction.message}`,
      20,
      y
    );
  }

  y += 6;
  y = section(doc, "6. Groq AI Assistant Summary", y);

  y = addText(
    doc,
    aiSummary ||
      "Groq AI Assistant summary unavailable. Continue routine monitoring and review the clinical dashboard data.",
    20,
    y
  );

  y += 6;
  y = section(doc, "7. Clinician Sign-off", y);

  y = addText(doc, "Clinician Name: ________________________________", 20, y);
  y += 4;
  y = addText(doc, "Signature: _____________________________________", 20, y);
  y += 4;
  y = addText(doc, "Date: __________________________________________", 20, y);

  y += 8;
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  addText(
    doc,
    "Safety note: This report is generated for educational/project demonstration purposes and does not replace professional clinical judgement.",
    20,
    y
  );

  doc.save(`${patient.name.replaceAll(" ", "-")}-clinician-report.pdf`);
}
