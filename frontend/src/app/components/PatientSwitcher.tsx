import { useHealthData } from "../context/HealthDataContext";

export default function PatientSwitcher() {
  const { patients, selectedPatient, setSelectedPatientId } = useHealthData();

  return (
    <select
      value={selectedPatient.id}
      onChange={(event) => setSelectedPatientId(Number(event.target.value))}
      className="w-full rounded-xl bg-gray-100 px-4 py-3 dark:bg-slate-800 sm:w-auto sm:min-w-[220px]"
    >
      {patients.map((patient) => (
        <option key={patient.id} value={patient.id}>
          {patient.name}
        </option>
      ))}
    </select>
  );
}
