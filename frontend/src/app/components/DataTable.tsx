import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Card } from "./ui/card";
import type { HealthData } from "../data/healthData";

interface DataTableProps {
  data: HealthData[];
}

export default function DataTable({ data }: DataTableProps) {
  const getRiskColor = (score: number) => {
    if (score <= 3) return "text-green-600 dark:text-green-400 font-semibold";
    if (score <= 6) return "text-yellow-600 dark:text-yellow-400 font-semibold";
    return "text-red-600 dark:text-red-400 font-semibold";
  };

  return (
    <Card className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-950 dark:text-white">
          Patient Dataset
        </h3>

        <span className="text-sm text-gray-500 dark:text-slate-400">
          {data.length} rows
        </span>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>Patient ID</TableHead>
              <TableHead>Heart Rate</TableHead>
              <TableHead>SpO₂</TableHead>
              <TableHead>Blood Pressure</TableHead>
              <TableHead>Steps</TableHead>
              <TableHead>Sleep</TableHead>
              <TableHead>Activity</TableHead>
              <TableHead>Risk Score</TableHead>
              <TableHead>State</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {data.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.timestamp}</TableCell>
                <TableCell>{row.patientId}</TableCell>
                <TableCell>{row.heartRate} bpm</TableCell>
                <TableCell>{row.spo2}%</TableCell>
                <TableCell>
                  {row.systolicBP}/{row.diastolicBP}
                </TableCell>
                <TableCell>{row.steps.toLocaleString()}</TableCell>
                <TableCell>{row.sleepHours}h</TableCell>
                <TableCell>{row.activeMinutes} min</TableCell>
                <TableCell className={getRiskColor(row.riskScore)}>
                  {row.riskScore}/10
                </TableCell>
                <TableCell className="capitalize">{row.activityState}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}