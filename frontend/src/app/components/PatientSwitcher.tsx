import { useState } from "react";
import { Search, UsersRound } from "lucide-react";

import { useHealthData } from "../context/HealthDataContext";

export default function PatientSwitcher() {
  const { patients, selectedPatient, setSelectedPatientId } = useHealthData();
  const [query, setQuery] = useState("");
  const filtered = patients.filter((patient) =>
    `${patient.name} ${patient.condition} ${patient.riskLevel}`
      .toLowerCase()
      .includes(query.toLowerCase())
  );

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-slate-500">
          <UsersRound className="h-4 w-4" /> Assigned patient
        </span>
        <span className="rounded-full bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-700">
          {patients.length} assigned
        </span>
      </div>
      {patients.length > 8 && (
        <label className="relative mb-2 block">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search assigned patients"
            className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm dark:border-slate-700 dark:bg-slate-950"
          />
        </label>
      )}
      <select
        value={selectedPatient.id}
        onChange={(event) => setSelectedPatientId(Number(event.target.value))}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold dark:border-slate-700 dark:bg-slate-950"
        aria-label="Switch assigned patient"
      >
        {filtered.map((patient) => (
          <option key={patient.id} value={patient.id}>
            {patient.name} · {patient.riskLevel} · {patient.condition}
          </option>
        ))}
      </select>
    </div>
  );
}
