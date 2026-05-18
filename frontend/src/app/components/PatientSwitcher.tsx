import { useHealthData } from "../context/HealthDataContext";

export default function PatientSwitcher() {
  const { patients, selectedPatient, setSelectedPatientId } = useHealthData();

  return (
    <select
      value={selectedPatient.id}
      onChange={(event) => setSelectedPatientId(Number(event.target.value))}
      className="min-w-[220px] rounded-xl bg-gray-100 px-4 py-3 dark:bg-slate-800"
    >
      {patients.map((patient) => (
        <option key={patient.id} value={patient.id}>
          {patient.name}
        </option>
      ))}
    </select>
  );
}