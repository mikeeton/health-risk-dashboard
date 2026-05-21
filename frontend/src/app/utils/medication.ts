export type MedicationStatus = "Taken" | "Missed" | "Due";

export type MedicationRecord = {
  id: string;
  patientId: number;
  name: string;
  dosage: string;
  time: string;
  status: MedicationStatus;
};

export const medicationRecords: MedicationRecord[] = [
  {
    id: "med-1",
    patientId: 1,
    name: "Amlodipine",
    dosage: "5mg",
    time: "08:00",
    status: "Taken",
  },
  {
    id: "med-2",
    patientId: 2,
    name: "Metformin",
    dosage: "500mg",
    time: "09:00",
    status: "Due",
  },
  {
    id: "med-3",
    patientId: 4,
    name: "Aspirin",
    dosage: "75mg",
    time: "20:00",
    status: "Missed",
  },
];