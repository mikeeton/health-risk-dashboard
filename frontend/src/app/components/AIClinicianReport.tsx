import { FileText, Copy } from "lucide-react";
import { useToast } from "../context/ToastContext";

type Props = {
  report: string;
};

export default function AIClinicianReport({ report }: Props) {
  const { showToast } = useToast();

  const copyReport = async () => {
    await navigator.clipboard.writeText(report);

    showToast({
      type: "success",
      title: "Report copied",
      message: "Calculated clinical summary copied to clipboard.",
    });
  };

  return (
    <section className="glass-card rounded-3xl p-6">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <FileText className="h-6 w-6 text-blue-600" />

          <div>
            <h2 className="text-xl font-bold">Calculated Clinical Summary</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Rule-based summary assembled locally — not Groq-generated
            </p>
          </div>
        </div>

        <button
          onClick={copyReport}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700"
        >
          <Copy className="h-4 w-4" />
          Copy
        </button>
      </div>

      <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap rounded-2xl bg-slate-950 p-5 text-sm leading-7 text-slate-100">
        {report}
      </pre>
    </section>
  );
}
