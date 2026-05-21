import { useEffect, useState } from "react";

import {
  getReviewCases,
  updateReviewCase,
} from "../services/api";

type ReviewCase = {
  id: number;

  patient_id: number;

  patient_name: string;

  risk_level: string;

  risk_score: number;

  status: string;

  note?: string;

  created_at: string;

  updated_at?: string;
};

export default function ReviewCases() {
  const [cases, setCases] = useState<ReviewCase[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [savingId, setSavingId] =
    useState<number | null>(null);

  const fetchCases = async () => {
    try {
      const data =
        await getReviewCases();

      setCases(data);
    } catch (error) {
      console.error(
        "Failed to fetch review cases:",
        error
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, []);

  const updateStatus = async (
    caseId: number,
    status: string,
    note?: string
  ) => {
    try {
      setSavingId(caseId);

      await updateReviewCase(
        caseId,
        {
          status,
          note,
        }
      );

      await fetchCases();
    } catch (error) {
      console.error(
        "Failed to update case:",
        error
      );
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        Loading review cases...
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">
          Review Cases
        </h1>

        <p className="mt-2 text-gray-500 dark:text-slate-400">
          Clinician workflow and
          escalation management
        </p>
      </div>

      {cases.length === 0 ? (
        <div className="rounded-xl bg-green-50 p-6 text-green-700 dark:bg-green-950/30 dark:text-green-400">
          No review cases found.
        </div>
      ) : (
        <div className="grid gap-6">
          {cases.map((reviewCase) => (
            <div
              key={reviewCase.id}
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold">
                    {
                      reviewCase.patient_name
                    }
                  </h2>

                  <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                    Risk Score:
                    {" "}
                    {
                      reviewCase.risk_score
                    }
                    /10
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      reviewCase.risk_level ===
                      "Critical"
                        ? "bg-red-600 text-white"
                        : "bg-orange-500 text-white"
                    }`}
                  >
                    {
                      reviewCase.risk_level
                    }
                  </span>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      reviewCase.status ===
                      "Resolved"
                        ? "bg-green-600 text-white"
                        : reviewCase.status ===
                          "Under Review"
                        ? "bg-blue-600 text-white"
                        : "bg-yellow-500 text-black"
                    }`}
                  >
                    {
                      reviewCase.status
                    }
                  </span>
                </div>
              </div>

              <div className="mt-5">
                <label className="mb-2 block text-sm font-medium">
                  Clinician Notes
                </label>

                <textarea
                  defaultValue={
                    reviewCase.note || ""
                  }
                  id={`note-${reviewCase.id}`}
                  rows={4}
                  className="w-full rounded-xl border border-gray-300 bg-white p-4 dark:border-slate-700 dark:bg-slate-950"
                />
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  disabled={
                    savingId ===
                    reviewCase.id
                  }
                  onClick={() => {
                    const textarea =
                      document.getElementById(
                        `note-${reviewCase.id}`
                      ) as HTMLTextAreaElement;

                    updateStatus(
                      reviewCase.id,
                      "Under Review",
                      textarea.value
                    );
                  }}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  Mark Under Review
                </button>

                <button
                  disabled={
                    savingId ===
                    reviewCase.id
                  }
                  onClick={() => {
                    const textarea =
                      document.getElementById(
                        `note-${reviewCase.id}`
                      ) as HTMLTextAreaElement;

                    updateStatus(
                      reviewCase.id,
                      "Resolved",
                      textarea.value
                    );
                  }}
                  className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                >
                  Resolve Case
                </button>

                <button
                  disabled={
                    savingId ===
                    reviewCase.id
                  }
                  onClick={() => {
                    const textarea =
                      document.getElementById(
                        `note-${reviewCase.id}`
                      ) as HTMLTextAreaElement;

                    updateStatus(
                      reviewCase.id,
                      "Escalated",
                      textarea.value
                    );
                  }}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  Escalate
                </button>
              </div>

              <div className="mt-5 text-xs text-gray-500 dark:text-slate-500">
                Created:
                {" "}
                {
                  reviewCase.created_at
                }

                {reviewCase.updated_at && (
                  <>
                    {" "}
                    • Updated:
                    {" "}
                    {
                      reviewCase.updated_at
                    }
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}