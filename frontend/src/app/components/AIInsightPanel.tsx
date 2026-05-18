import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Sparkles } from "lucide-react";

interface AIInsightPanelProps {
  insight: string;
  onGenerate: () => void;
}

export default function AIInsightPanel({
  insight,
  onGenerate,
}: AIInsightPanelProps) {
  return (
    <Card className="border-blue-200 bg-blue-50 p-6 dark:border-blue-900/60 dark:bg-slate-900">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h3 className="font-semibold text-gray-950 dark:text-white">
              AI Insight
            </h3>
          </div>

          <p className="leading-relaxed text-gray-700 dark:text-slate-300">
            {insight}
          </p>
        </div>

        <Button
          onClick={onGenerate}
          className="bg-blue-600 text-white hover:bg-blue-700"
        >
          <Sparkles className="mr-2 h-4 w-4" />
          Generate Insight
        </Button>
      </div>
    </Card>
  );
}