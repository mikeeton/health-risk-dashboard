import { useEffect, useState } from "react";
import { TrendingUp } from "lucide-react";
import { getLinearRegressionForecast } from "../services/api";

type Props = {
  patientId: number;
};

type Forecast = {
  next_heart_rate: number;
  next_spo2: number;
  next_systolic_bp: number;
  next_diastolic_bp: number;
  next_risk_score: number;
  message: string;
};

export default function LinearRegressionPanel({ patientId }: Props) {
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadForecast() {
      try {
        setError("");
        const data = await getLinearRegressionForecast(patientId);
        setForecast(data);
      } catch {
        setForecast(null);
        setError("At least 5 vital records are required for linear regression.");
      }
    }

    loadForecast();
  }, [patientId]);

  return (
    <section className="glass-card rounded-3xl p-6">
      <div className="mb-5 flex items-center gap-3">
        <TrendingUp className="h-6 w-6 text-blue-600" />

        <div>
          <h2 className="text-xl font-bold">Linear Regression Forecast</h2>
          <p className="text-sm text-slate-500">
            Predicts next vital trend from historical records
          </p>
        </div>
      </div>

      {error ? (
        <p className="rounded-2xl bg-yellow-50 p-4 text-sm text-yellow-700">
          {error}
        </p>
      ) : forecast ? (
        <div className="grid gap-4 md:grid-cols-5">
          <div>
            <p className="text-xs text-slate-500">Heart Rate</p>
            <p className="text-2xl font-bold">{forecast.next_heart_rate}</p>
          </div>

          <div>
            <p className="text-xs text-slate-500">SpO₂</p>
            <p className="text-2xl font-bold">{forecast.next_spo2}%</p>
          </div>

          <div>
            <p className="text-xs text-slate-500">Systolic</p>
            <p className="text-2xl font-bold">{forecast.next_systolic_bp}</p>
          </div>

          <div>
            <p className="text-xs text-slate-500">Diastolic</p>
            <p className="text-2xl font-bold">{forecast.next_diastolic_bp}</p>
          </div>

          <div>
            <p className="text-xs text-slate-500">Risk</p>
            <p className="text-2xl font-bold">{forecast.next_risk_score}/10</p>
          </div>
        </div>
      ) : (
        <p>Loading forecast...</p>
      )}
    </section>
  );
}