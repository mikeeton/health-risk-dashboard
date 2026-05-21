import { createContext, useContext, useEffect, useState } from "react";

import type { HealthData } from "../data/healthData";
import { healthData as defaultHealthData } from "../data/healthData";

import type { Patient } from "../../types/patient";
import { getPatients, getVitals } from "../services/api";

type HealthDataContextType = {
  healthData: HealthData[];
  setHealthData: React.Dispatch<React.SetStateAction<HealthData[]>>;

  patients: Patient[];
  selectedPatient: Patient;
  setSelectedPatientId: (id: number) => void;

  loading: boolean;
  refreshVitals: () => Promise<void>;
};

const fallbackPatient: Patient = {
  id: 1,
  name: "Sarah Johnson",
  age: 62,
  condition: "Hypertension",
  riskLevel: "Moderate",
  lastCheckup: "2026-05-01",
};

const HealthDataContext = createContext<HealthDataContextType | undefined>(
  undefined
);

function mapBackendPatient(patient: any): Patient {
  return {
    id: patient.id,
    name: patient.name,
    age: patient.age,
    condition: patient.condition,
    riskLevel: patient.risk_level ?? "Low",
    lastCheckup: patient.last_checkup ?? "",
  };
}

function mapBackendVital(vital: any): HealthData {
  return {
    id: String(vital.id),
    patientId: vital.patient_id,
    timestamp: vital.timestamp,
    heartRate: vital.heart_rate,
    spo2: vital.spo2,
    systolicBP: vital.systolic_bp,
    diastolicBP: vital.diastolic_bp,
    steps: vital.steps,
    sleepHours: vital.sleep_hours,
    activeMinutes: vital.active_minutes,
    calories: vital.calories,
    riskScore: vital.risk_score,
    activityState: vital.activity_state,
  };
}

export function HealthDataProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [healthData, setHealthData] = useState<HealthData[]>(
    defaultHealthData
  );

  const [patients, setPatients] = useState<Patient[]>([fallbackPatient]);

  const [selectedPatientId, setSelectedPatientId] = useState<number>(1);

  const [loading, setLoading] = useState(true);

  const selectedPatient =
    patients.find((patient) => patient.id === selectedPatientId) ??
    patients[0] ??
    fallbackPatient;

  const refreshVitals = async () => {
    try {
      const vitals = await getVitals(selectedPatient.id);
      const mappedVitals = vitals.map(mapBackendVital);

      setHealthData((previousData) => {
        const otherPatientsData = previousData.filter(
          (record) => record.patientId !== selectedPatient.id
        );

        return [...otherPatientsData, ...mappedVitals];
      });
    } catch (error) {
      console.error("Failed to fetch vitals:", error);
    }
  };

  useEffect(() => {
    async function loadPatients() {
      try {
        const backendPatients = await getPatients();
        const mappedPatients = backendPatients.map(mapBackendPatient);

        if (mappedPatients.length > 0) {
          setPatients(mappedPatients);
          setSelectedPatientId(mappedPatients[0].id);
        }
      } catch (error) {
        console.error("Failed to fetch patients:", error);
      } finally {
        setLoading(false);
      }
    }

    loadPatients();
  }, []);

  useEffect(() => {
    if (!selectedPatient?.id) return;

    refreshVitals();
  }, [selectedPatient.id]);

  return (
    <HealthDataContext.Provider
      value={{
        healthData,
        setHealthData,
        patients,
        selectedPatient,
        setSelectedPatientId,
        loading,
        refreshVitals,
      }}
    >
      {children}
    </HealthDataContext.Provider>
  );
}

export function useHealthData() {
  const context = useContext(HealthDataContext);

  if (!context) {
    throw new Error("useHealthData must be used inside HealthDataProvider");
  }

  return context;
}