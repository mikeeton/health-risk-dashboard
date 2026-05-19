import { ShieldAlert } from "lucide-react";
import { Card } from "./ui/card";
import type { ClinicianCase } from "../utils/clinicianQueue";
import { createReviewCase } from "../services/api";

type Props = {
  queue: ClinicianCase[];
};

export default function ClinicianQueue({ queue }: Props) {
  const handleReview = async (item: ClinicianCase) => {
    try {
      await createReviewCase({
        patient_id: item.patientId,
        patient_name: item.patientName,
        risk_level: item.riskLevel,
        risk_score: item.riskScore,
        note: item.reasons.join(" "),
      });

      alert(`${item.patientName} has been added to the clinician review list.`);
    } catch {
      alert("Could not create review case. Check backend is running.");
    }
  };

  const handleEscalate = async (item: ClinicianCase) => {
    try {
      await createReviewCase({
        patient_id: item.patientId,
        patient_name: item.patientName,
        risk_level: "Critical",
        risk_score: item.riskScore,
        note: `Escalated case: ${item.reasons.join(" ")}`,
      });

      alert(`${item.patientName} has been escalated for urgent review.`);
    } catch {
      alert("Could not escalate case. Check backend is running.");
    }
  };

  return (
    <Card className="p-6">
      <div className="mb-5 flex items-center gap-3">
        <ShieldAlert className="h-6 w-6 text-red-600" />

        <div>
          <h2 className="text-xl font-bold">
            Clinician Queue
          </h2>

          <p className="text-sm text-gray-500 dark:text-slate-400">
            Patients requiring clinician review
          </p>
        </div>
      </div>

      {queue.length === 0 ? (
        <div className="rounded-xl bg-green-50 p-4 text-green-700 dark:bg-green-950/30 dark:text-green-400">
          No patients currently require clinician review.
        </div>
      ) : (
        <div className="space-y-4">
          {queue.map((item) => (
            <div
              key={item.patientId}
              className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">
                    {item.patientName}
                  </h3>

                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    {item.condition}
                  </p>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    item.riskLevel === "Critical"
                      ? "bg-red-600 text-white"
                      : "bg-orange-500 text-white"
                  }`}
                >
                  {item.riskLevel}
                </span>
              </div>

              <div className="mt-4 space-y-2">
                {item.reasons.map((reason, index) => (
                  <p
                    key={index}
                    className="text-sm text-gray-700 dark:text-slate-300"
                  >
                    • {reason}
                  </p>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500">
                <span>Risk Score: {item.riskScore}/10</span>
                <span>{item.latestTimestamp}</span>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  onClick={() => handleReview(item)}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Mark for Review
                </button>

                <button
                  onClick={() => handleEscalate(item)}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                >
                  Escalate
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}