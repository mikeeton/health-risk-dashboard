import { Pill, CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import { medicationRecords } from "../utils/medication";

type Props = {
  patientId: number;
};

export default function MedicationPanel({ patientId }: Props) {
  const records = medicationRecords.filter((item) => item.patientId === patientId);

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
            Simulated medication tracking
          </p>
        </div>
      </div>

      {records.length === 0 ? (
        <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-slate-900">
          No medication records for this patient.
        </p>
      ) : (
        <div className="space-y-3">
          {records.map((record) => {
            const Icon = getIcon(record.status);

            return (
              <div
                key={record.id}
                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white/70 p-4 dark:border-slate-700 dark:bg-slate-900/70"
              >
                <div>
                  <p className="font-bold">{record.name}</p>
                  <p className="text-sm text-slate-500">
                    {record.dosage} • {record.time}
                  </p>
                </div>

                <div className="flex items-center gap-2 text-sm font-bold">
                  <Icon className="h-4 w-4 text-blue-600" />
                  {record.status}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}