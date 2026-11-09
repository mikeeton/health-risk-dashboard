import { useState } from "react";
import { useNavigate } from "react-router";
import { Upload, FileText, CheckCircle } from "lucide-react";
import Papa from "papaparse";

import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { useHealthData } from "../context/HealthDataContext";
import type { HealthData, ActivityState } from "../data/healthData";

import { calculateBaseline } from "../utils/baseline";
import { calculateRiskScore } from "../utils/riskEngine";
import { createVital, VitalSaveError } from "../services/api";

export default function UploadData() {
  const navigate = useNavigate();

  const { selectedPatient, hasPatients, healthData, refreshVitals } = useHealthData();

  const [fileName, setFileName] = useState("");
  const [parsedData, setParsedData] = useState<HealthData[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [completedRows, setCompletedRows] = useState(0);
  const [existingRows, setExistingRows] = useState(0);
  const [uploadError, setUploadError] = useState("");
  const dataPreview = parsedData.slice(0, 5);

  const cleanActivityState = (value: string): ActivityState => {
    const state = value?.toLowerCase().trim();

    if (
      state === "resting" ||
      state === "walking" ||
      state === "running" ||
      state === "sleeping"
    ) {
      return state;
    }

    return "resting";
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) return;

    setFileName(file.name);
    setParsedData([]);
    setCompletedRows(0);
    setExistingRows(0);
    setUploadError("");

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,

      complete: (results) => {
        if (results.errors.length) {
          setUploadError(`CSV could not be parsed: ${results.errors[0].message}`);
          return;
        }
        const existingPatientData = healthData.filter(
          (record) => record.patientId === selectedPatient.id
        );

        const baseline = calculateBaseline(existingPatientData);

        const cleanedData: HealthData[] = results.data.map((row) => {
          const recordWithoutRisk = {
            id: crypto.randomUUID(),
            patientId: selectedPatient.id,
            timestamp: row.timestamp || row.date || new Date().toISOString(),

            heartRate: Number(row.heartRate) || 0,
            spo2: Number(row.spo2) || 0,
            systolicBP: Number(row.systolicBP) || 0,
            diastolicBP: Number(row.diastolicBP) || 0,

            steps: Number(row.steps) || 0,
            sleepHours: Number(row.sleepHours) || 0,
            activeMinutes: Number(row.activeMinutes) || 0,
            calories: Number(row.calories) || 0,

            activityState: cleanActivityState(row.activityState),
          };

          const riskResult = calculateRiskScore(
            recordWithoutRisk,
            selectedPatient,
            baseline
          );

          return {
            ...recordWithoutRisk,
            riskScore: riskResult.riskScore,
          };
        });

        setParsedData(cleanedData);
      },
      error: (error) => setUploadError(`CSV could not be read: ${error.message}`),
    });
  };

  const handleUpload = async () => {
    if (parsedData.length === 0) {
      alert("Please choose a CSV file first.");
      return;
    }
    if (!hasPatients || parsedData.some((row) => row.patientId !== selectedPatient.id)) {
      setUploadError("The selected patient changed. Choose the CSV again for this patient.");
      return;
    }

    let completed = completedRows;
    let existing = existingRows;
    try {
      setIsUploading(true);
      setUploadError("");

      for (const record of parsedData.slice(completedRows)) {
        try {
          await createVital({
          patient_id: record.patientId,
          timestamp: record.timestamp,
          heart_rate: record.heartRate,
          spo2: record.spo2,
          systolic_bp: record.systolicBP,
          diastolic_bp: record.diastolicBP,
          steps: record.steps,
          sleep_hours: record.sleepHours,
          active_minutes: record.activeMinutes,
          calories: record.calories,
          risk_score: record.riskScore,
          activity_state: record.activityState,
          source: "csv_upload",
          });
        } catch (error) {
          // A response can be lost after the backend commits. Its duplicate
          // response on retry confirms the row is already present.
          if (!(error instanceof VitalSaveError) || error.status !== 409) throw error;
          existing += 1;
          setExistingRows(existing);
        }
        completed += 1;
        setCompletedRows(completed);
      }

      await refreshVitals();

      alert(`${selectedPatient.name}'s dataset uploaded successfully! ${completed - existing} rows saved; ${existing} already present.`);

      navigate("/");
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Connection unavailable";
      setUploadError(`Upload stopped at row ${completed + 1}. ${completed - existing} rows saved; ${existing} already present; ${parsedData.length - completed} remaining. ${reason}. Retry continues from this row. To correct the file, choose it again; existing readings will be skipped.`);
      await refreshVitals();
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="dashboard-shell max-w-[1200px] space-y-7">
      <div>
        <h1 className="text-2xl font-bold text-gray-950 dark:text-white sm:text-3xl">
          Upload Health Dataset
        </h1>

        <p className="mt-2 text-gray-600 dark:text-slate-400">
          Upload smartwatch-style patient health data for calculated risk indicators
          analysis.
        </p>
      </div>

      <Card className="p-5 sm:p-7">
        <div className="rounded-xl border border-dashed border-blue-200 bg-blue-50/30 p-6 text-center dark:border-blue-900 dark:bg-blue-950/20 sm:p-10">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300">
            <Upload className="h-8 w-8" />
          </div>

          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Upload health dataset
          </h2>

          <p className="mt-2 text-gray-600 dark:text-slate-400">
            Selected patient:
            <span className="ml-2 font-semibold text-blue-700 dark:text-blue-300">
              {selectedPatient.name}
            </span>
          </p>

          <p className="mt-3 text-gray-600 dark:text-slate-400">
            Risk score will be calculated automatically by deterministic thresholds and
            saved into the backend database.
          </p>

          <label className="mt-6 inline-block">
            <input
              id="vitals-csv-upload"
              name="vitals_csv_upload"
              aria-label="Choose vitals CSV file"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              disabled={isUploading || !hasPatients}
              className="hidden"
            />

            <span className="clinical-button inline-flex cursor-pointer items-center justify-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
              Choose CSV File
            </span>
          </label>

          {fileName && (
            <div className="mt-6 text-green-600" aria-live="polite">
              <div className="flex items-center justify-center gap-2 font-medium">
                <CheckCircle className="h-5 w-5" />
                <span>{fileName} loaded</span>
              </div>
              <p className="mt-2 text-sm">
                {parsedData.length} parsed rows; previewing {dataPreview.length}.
              </p>
            </div>
          )}
        </div>
      </Card>

      <Card className="p-6">
        <div className="mb-4 flex items-center gap-3">
          <FileText className="h-6 w-6 text-blue-600" />

          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Expected CSV Columns
          </h2>
        </div>

        <div className="overflow-x-auto rounded-lg bg-slate-50 p-4 font-mono text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          patientId,timestamp,heartRate,spo2,systolicBP,diastolicBP,steps,sleepHours,activeMinutes,calories,activityState
        </div>

        <p className="mt-3 text-sm text-gray-500 dark:text-slate-400">
          The CSV may include riskScore, but this app ignores it and calculates
          risk automatically.
        </p>
      </Card>

      {dataPreview.length > 0 && (
        <Card className="p-6">
          <h2 className="mb-4 text-xl font-semibold">Preview</h2>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b text-left">
                <tr>
                  {Object.keys(dataPreview[0]).map((key) => (
                    <th key={key} className="px-3 py-2">
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {dataPreview.map((row) => (
                  <tr key={row.id} className="border-b">
                    {Object.values(row).map((value, index) => (
                      <td key={index} className="px-3 py-2">
                        {String(value)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {uploadError && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800 dark:bg-red-950 dark:text-red-200">{uploadError}</p>}
      {completedRows > 0 && <p role="status">{completedRows} of {parsedData.length} rows processed ({existingRows} already present).</p>}
      <Button
        onClick={handleUpload}
        disabled={isUploading || !hasPatients || parsedData.length === 0}
        className="bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {isUploading ? "Uploading..." : uploadError && parsedData.length > 0 ? "Retry Upload" : "Upload Dataset"}
      </Button>
    </div>
  );
}
