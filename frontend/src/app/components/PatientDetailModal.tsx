import { X, UserRound, HeartPulse, Activity } from "lucide-react";
import type { Patient } from "../../types/patient";
import type { HealthData } from "../data/healthData";
import { calculateBaseline } from "../utils/baseline";

type Props = {
  patient: Patient;
  records: HealthData[];
  open: boolean;
  onClose: () => void;
};

export default function PatientDetailModal({ patient, records, open, onClose }: Props) {
  if (!open) return null;

  const baseline = calculateBaseline(records);
  const latest = records[records.length - 1];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
      <div className="glass-card w-full max-w-2xl rounded-3xl p-6">
        <div className="mb-6 flex items-start justify-between">
          <div className="flex gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white">
              <UserRound className="h-6 w-6" />
            </div>

            <div>
              <h2 className="text-2xl font-bold">{patient.name}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {patient.age} years • {patient.condition}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 transition hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl bg-white/70 p-4 dark:bg-slate-900/70">
            <HeartPulse className="mb-2 h-5 w-5 text-red-500" />
            <p className="text-sm text-slate-500">Resting Baseline</p>
            <p className="mt-2 font-bold">HR: {baseline.avgHeartRate} bpm</p>
            <p className="font-bold">SpO₂: {baseline.avgSpo2}%</p>
            <p className="font-bold">
              BP: {baseline.avgSystolicBP}/{baseline.avgDiastolicBP}
            </p>
          </div>

          <div className="rounded-2xl bg-white/70 p-4 dark:bg-slate-900/70">
            <Activity className="mb-2 h-5 w-5 text-blue-500" />
            <p className="text-sm text-slate-500">Latest Reading</p>

            {latest ? (
              <>
                <p className="mt-2 font-bold">HR: {latest.heartRate} bpm</p>
                <p className="font-bold">SpO₂: {latest.spo2}%</p>
                <p className="font-bold">
                  BP: {latest.systolicBP}/{latest.diastolicBP}
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm text-slate-500">No readings available.</p>
            )}
          </div>
        </div>

        <div className="mt-5 rounded-2xl bg-blue-50 p-4 text-sm text-blue-700 dark:bg-blue-950/30 dark:text-blue-300">
          Baseline status: {baseline.recordsUsed}/5 resting records collected.
        </div>
      </div>
    </div>
  );
}