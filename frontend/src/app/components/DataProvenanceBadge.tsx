import type { HealthData } from "../data/healthData";

type Props = { source?: HealthData["source"]; compact?: boolean };

const labels: Record<NonNullable<HealthData["source"]>, string> = {
  simulator: "Synthetic demonstration data",
  demo_seed: "Synthetic demonstration data",
  withings: "Withings device data",
  wearable: "Wearable device data",
  csv_upload: "Uploaded CSV data",
  manual: "Manually entered data",
};

export function isSyntheticSource(source?: HealthData["source"]) {
  return source === "simulator" || source === "demo_seed";
}

export default function DataProvenanceBadge({ source = "manual", compact = false }: Props) {
  const synthetic = isSyntheticSource(source);
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${
        synthetic
          ? "bg-violet-100 text-violet-800 dark:bg-violet-950/50 dark:text-violet-200"
          : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
      }`}
      title={labels[source]}
    >
      {compact && synthetic ? "Synthetic data" : labels[source]}
    </span>
  );
}
