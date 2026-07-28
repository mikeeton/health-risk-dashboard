import { createContext, useContext, useEffect, useState } from "react";

import type { HealthData } from "../data/healthData";

import type { Patient, RiskLevel } from "../../types/patient";
import { getPatients, getVitals } from "../services/api";
import { useAuth } from "./AuthContext";

type HealthDataContextType = {
  healthData: HealthData[];
  setHealthData: React.Dispatch<React.SetStateAction<HealthData[]>>;

  patients: Patient[];
  selectedPatient: Patient;
  hasPatients: boolean;
  setSelectedPatientId: (id: number) => void;

  loading: boolean;
  refreshVitals: () => Promise<void>;
};

type BackendPatient = {
  id: number;
  user_id?: number | null;
  primary_doctor_id?: number | null;
  assigned_nurse_id?: number | null;
  name: string;
  age: number;
  condition: string;
  risk_level?: RiskLevel | null;
  last_checkup?: string | null;
};

type BackendVital = {
  id: number;
  patient_id: number;
  timestamp: string;
  heart_rate: number;
  spo2: number;
  systolic_bp: number;
  diastolic_bp: number;
  steps: number;
  sleep_hours: number;
  active_minutes: number;
  calories: number;
  risk_score: number;
  activity_state: HealthData["activityState"];
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

function mapBackendPatient(patient: BackendPatient): Patient {
  return {
    id: patient.id,
    userId: patient.user_id ?? null,
    primaryDoctorId: patient.primary_doctor_id ?? null,
    assignedNurseId: patient.assigned_nurse_id ?? null,
    name: patient.name,
    age: patient.age,
    condition: patient.condition,
    riskLevel: patient.risk_level ?? "Low",
    lastCheckup: patient.last_checkup ?? "",
  };
}

function mapBackendVital(vital: BackendVital): HealthData {
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
  const { token, isAdmin } = useAuth();

  const [healthData, setHealthData] = useState<HealthData[]>([]);

  const [patients, setPatients] = useState<Patient[]>([]);

  const [selectedPatientId, setSelectedPatientId] = useState<number>(1);

  const [loading, setLoading] = useState(true);

  const selectedPatient =
    patients.find((patient) => patient.id === selectedPatientId) ??
    patients[0] ??
    fallbackPatient;

  const refreshVitals = async () => {
    if (!token || isAdmin || patients.length === 0) return;

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
    if (!token || isAdmin) {
      // Admin users do not load clinical patient/vital data. This keeps the
      // frontend aligned with the backend privacy model and avoids noisy
      // rejected requests on admin-only screens.
      setPatients([]);
      setSelectedPatientId(0);
      setHealthData([]);
      setLoading(false);
      return;
    }

    async function loadPatients() {
      setLoading(true);

      try {
        const backendPatients = await getPatients();
        const mappedPatients = backendPatients.map(mapBackendPatient);

        if (mappedPatients.length > 0) {
          setPatients(mappedPatients);
          setSelectedPatientId(mappedPatients[0].id);
        } else {
          setPatients([]);
          setSelectedPatientId(0);
          setHealthData([]);
        }
      } catch (error) {
        console.error("Failed to fetch patients:", error);
      } finally {
        setLoading(false);
      }
    }

    loadPatients();
  }, [token, isAdmin]);

  useEffect(() => {
    if (!token || isAdmin || patients.length === 0) return;

    refreshVitals();
  }, [selectedPatient.id, token, isAdmin, patients.length]);

  return (
    <HealthDataContext.Provider
      value={{
        healthData,
        setHealthData,
        patients,
        selectedPatient,
        hasPatients: patients.length > 0,
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
