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
import { createVital } from "../services/api";

export default function UploadData() {
  const navigate = useNavigate();

  const { selectedPatient, healthData, refreshVitals } = useHealthData();

  const [fileName, setFileName] = useState("");
  const [dataPreview, setDataPreview] = useState<HealthData[]>([]);
  const [isUploading, setIsUploading] = useState(false);

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

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,

      complete: (results) => {
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

        setDataPreview(cleanedData.slice(0, 5));
      },
    });
  };

  const handleUpload = async () => {
    if (dataPreview.length === 0) {
      alert("Please choose a CSV file first.");
      return;
    }

    try {
      setIsUploading(true);

      for (const record of dataPreview) {
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
        });
      }

      await refreshVitals();

      alert(`${selectedPatient.name}'s dataset uploaded successfully!`);

      navigate("/");
    } catch (error) {
      console.error(error);
      alert("Upload failed. Please check backend is running.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1200px] space-y-6 px-4 py-6 sm:p-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white sm:text-3xl">
          Upload Data
        </h1>

        <p className="mt-2 text-gray-600 dark:text-slate-400">
          Upload smartwatch-style patient health data for AI-assisted risk
          analysis.
        </p>
      </div>

      <Card className="p-4 sm:p-8">
        <div className="rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 p-5 text-center dark:border-slate-700 dark:bg-slate-800 sm:p-10">
          <Upload className="mx-auto mb-4 h-12 w-12 text-blue-600" />

          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Upload health dataset
          </h2>

          <p className="mt-2 text-gray-600 dark:text-slate-400">
            Selected patient:
            <span className="ml-2 font-semibold text-blue-600">
              {selectedPatient.name}
            </span>
          </p>

          <p className="mt-3 text-gray-600 dark:text-slate-400">
            Risk score will be calculated automatically by the AI risk engine and
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
              className="hidden"
            />

            <span className="inline-flex cursor-pointer items-center justify-center rounded-md bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700">
              Choose CSV File
            </span>
          </label>

          {fileName && (
            <div className="mt-6 flex items-center justify-center gap-2 font-medium text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span>{fileName} loaded</span>
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

        <div className="overflow-x-auto rounded-xl bg-gray-100 p-4 font-mono text-sm dark:bg-slate-800">
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

      <Button
        onClick={handleUpload}
        disabled={isUploading}
        className="bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {isUploading ? "Uploading..." : "Upload Dataset"}
      </Button>
    </div>
  );
}
