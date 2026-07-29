import { useEffect, useState } from "react";
import { Pill, CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import {
  createMedication,
  getMedications,
  updateMedication,
} from "../services/api";

type Medication = {
  id: number;
  patient_id: number;
  name: string;
  dosage: string;
  schedule_time: string;
  status: string;
  notes?: string | null;
};

type Props = {
  patientId: number;
  canAddMedication?: boolean;
  canUpdateStatus?: boolean;
};

export default function MedicationAdherenceDatabase({
  patientId,
  canAddMedication = true,
  canUpdateStatus = true,
}: Props) {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [name, setName] = useState("Amlodipine");
  const [dosage, setDosage] = useState("5mg");
  const [scheduleTime, setScheduleTime] = useState("08:00");

  const loadMedications = async () => {
    try {
      const data = await getMedications(patientId);
      setMedications(data);
    } catch (error) {
      console.error("Failed to load medications:", error);
    }
  };

  useEffect(() => {
    loadMedications();
  }, [patientId]);

  const addMedication = async () => {
    await createMedication({
      patient_id: patientId,
      name,
      dosage,
      schedule_time: scheduleTime,
      status: "Due",
    });

    await loadMedications();
  };

  const changeStatus = async (id: number, status: string) => {
    await updateMedication(id, {
      status,
      notes: `Marked as ${status}`,
    });

    await loadMedications();
  };

  const getIcon = (status: string) => {
    if (status === "Taken") return CheckCircle2;
    if (status === "Missed") return AlertTriangle;
    return Clock;
  };

  return (
    <section className="glass-card rounded-3xl p-6">
      <div className="mb-5 flex items-center gap-3">
        <Pill className="h-6 w-6 text-blue-600" />

        <div>
          <h2 className="text-xl font-bold">Medication Adherence</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Saved in PostgreSQL
          </p>
        </div>
      </div>

      {canAddMedication && (
        <div className="mb-5 grid gap-3 md:grid-cols-4">
          <input name="medication_name" aria-label="Medication name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-900"
            placeholder="Medication name"
          />

          <input name="medication_dosage" aria-label="Medication dosage"
            value={dosage}
            onChange={(event) => setDosage(event.target.value)}
            className="rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-900"
            placeholder="Dosage"
          />

          <input name="medication_schedule_time" aria-label="Medication schedule time"
            value={scheduleTime}
            onChange={(event) => setScheduleTime(event.target.value)}
            className="rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-900"
            placeholder="Time"
          />

          <button
            onClick={addMedication}
            className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700"
          >
            Add Medication
          </button>
        </div>
      )}

      <div className="space-y-3">
        {medications.map((medication) => {
          const Icon = getIcon(medication.status);

          return (
            <div
              key={medication.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/70 p-4 dark:bg-slate-900/70"
            >
              <div>
                <p className="font-bold">{medication.name}</p>
                <p className="text-sm text-slate-500">
                  {medication.dosage} • {medication.schedule_time}
                </p>
              </div>

              <div className="flex items-center gap-2 text-sm font-bold">
                <Icon className="h-4 w-4 text-blue-600" />
                {medication.status}
              </div>

              {canUpdateStatus && (
                <div className="flex gap-2">
                  <button
                    onClick={() => changeStatus(medication.id, "Taken")}
                    className="rounded-lg bg-green-600 px-3 py-2 text-xs font-bold text-white"
                  >
                    Taken
                  </button>

                  <button
                    onClick={() => changeStatus(medication.id, "Missed")}
                    className="rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white"
                  >
                    Missed
                  </button>

                  <button
                    onClick={() => changeStatus(medication.id, "Due")}
                    className="rounded-lg bg-slate-600 px-3 py-2 text-xs font-bold text-white"
                  >
                    Due
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {!medications.length && (
          <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-slate-900">
            No medication records yet.
          </p>
        )}
      </div>
    </section>
  );
}
