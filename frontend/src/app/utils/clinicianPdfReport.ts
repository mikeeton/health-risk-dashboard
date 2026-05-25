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
  confidence: number;
  message: string;
};

function avg(values: number[]) {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function addWrappedText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight = 7
) {
  const lines = doc.splitTextToSize(text, maxWidth);
  doc.text(lines, x, y);
  return y + lines.length * lineHeight;
}

function checkPage(doc: jsPDF, y: number) {
  if (y > 270) {
    doc.addPage();
    return 20;
  }

  return y;
}

export function generateClinicianPdfReport({
  patient,
  vitals,
  medications,
  events,
  prediction,
}: {
  patient: Patient;
  vitals: HealthData[];
  medications: Medication[];
  events: PatientEvent[];
  prediction: MLPrediction | null;
}) {
  const doc = new jsPDF("p", "mm", "a4");

  const latest = vitals[vitals.length - 1];
  const recent = vitals.slice(-10);

  let y = 20;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("AI Clinician Report", 20, y);

  y += 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 20, y);

  y += 14;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("1. Patient Summary", 20, y);

  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);

  y = addWrappedText(
    doc,
    `${patient.name} is a ${patient.age}-year-old patient with ${patient.condition}. Current recorded risk level: ${patient.riskLevel}. Last checkup: ${patient.lastCheckup}.`,
    20,
    y,
    170
  );

  y += 6;
  y = checkPage(doc, y);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("2. Vital Trends", 20, y);

  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);

  if (recent.length === 0) {
    y = addWrappedText(doc, "No vital records available.", 20, y, 170);
  } else {
    y = addWrappedText(
      doc,
      `Recent averages from ${recent.length} records: Heart Rate ${avg(
        recent.map((vital) => vital.heartRate)
      )} bpm, SpO2 ${avg(recent.map((vital) => vital.spo2))}%, Blood Pressure ${avg(
        recent.map((vital) => vital.systolicBP)
      )}/${avg(recent.map((vital) => vital.diastolicBP))}, Risk Score ${avg(
        recent.map((vital) => vital.riskScore)
      )}/10.`,
      20,
      y,
      170
    );

    y += 4;

    if (latest) {
      y = addWrappedText(
        doc,
        `Latest reading: HR ${latest.heartRate} bpm, SpO2 ${latest.spo2}%, BP ${latest.systolicBP}/${latest.diastolicBP}, Sleep ${latest.sleepHours}h, Risk ${latest.riskScore}/10, Activity: ${latest.activityState}.`,
        20,
        y,
        170
      );
    }
  }

  y += 6;
  y = checkPage(doc, y);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("3. Medication Adherence", 20, y);

  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);

  if (medications.length === 0) {
    y = addWrappedText(doc, "No medication records available.", 20, y, 170);
  } else {
    medications.forEach((medication) => {
      y = checkPage(doc, y);
      y = addWrappedText(
        doc,
        `• ${medication.name} ${medication.dosage} at ${medication.schedule_time} — ${medication.status}`,
        24,
        y,
        160
      );
    });
  }

  y += 6;
  y = checkPage(doc, y);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("4. Timeline Events", 20, y);

  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);

  if (events.length === 0) {
    y = addWrappedText(doc, "No timeline events recorded.", 20, y, 170);
  } else {
    events.slice(0, 8).forEach((event) => {
      y = checkPage(doc, y);
      y = addWrappedText(
        doc,
        `• ${event.event_type}: ${event.title} (${new Date(
          event.timestamp
        ).toLocaleString()}) ${event.description ? `- ${event.description}` : ""}`,
        24,
        y,
        160
      );
    });
  }

  y += 6;
  y = checkPage(doc, y);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("5. ML Prediction", 20, y);

  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);

  if (!prediction) {
    y = addWrappedText(
      doc,
      "ML prediction unavailable. At least 5 vital records are required.",
      20,
      y,
      170
    );
  } else {
    y = addWrappedText(
      doc,
      `Prediction Score: ${prediction.prediction_score}/10. Level: ${
        prediction.prediction_level
      }. Confidence: ${(prediction.confidence * 100).toFixed(0)}%. ${
        prediction.message
      }`,
      20,
      y,
      170
    );
  }

  y += 6;
  y = checkPage(doc, y);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("6. Clinician Recommendations", 20, y);

  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);

  const recommendation =
    prediction && prediction.prediction_score >= 7
      ? "Patient should be reviewed by a clinician. Repeat observations, assess symptoms, check medication adherence, and consider escalation if abnormal readings persist."
      : latest && latest.riskScore >= 7
      ? "Latest reading is high risk. Repeat vitals and consider clinician review."
      : "Continue routine monitoring. Encourage medication adherence and repeat baseline checks as scheduled.";

  y = addWrappedText(doc, recommendation, 20, y, 170);

  y += 10;

  doc.setFontSize(9);
  doc.setTextColor(120);
  addWrappedText(
    doc,
    "Disclaimer: This report is generated for educational/project demonstration purposes and does not replace professional medical judgement.",
    20,
    y,
    170,
    5
  );

  doc.save(`${patient.name.replaceAll(" ", "-")}-clinician-report.pdf`);
}