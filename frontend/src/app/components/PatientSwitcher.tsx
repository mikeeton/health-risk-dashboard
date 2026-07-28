import { useHealthData } from "../context/HealthDataContext";

export default function PatientSwitcher() {
  const { patients, selectedPatient, setSelectedPatientId } = useHealthData();

  return (
    <select
      value={selectedPatient.id}
      onChange={(event) => setSelectedPatientId(Number(event.target.value))}
      className="h-11 w-full rounded-xl border border-slate-200 bg-white/80 px-4 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900/80"
    >
      {patients.map((patient) => (
        <option key={patient.id} value={patient.id}>
          {patient.name}
        </option>
      ))}
    </select>
  );
}
