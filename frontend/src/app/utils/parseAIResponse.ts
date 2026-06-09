export type ParsedAIResponse = {
  riskLevel: "Low" | "Medium" | "High" | "Unknown";
  summary: string;
  concerns: string[];
  recommendation: string;
  raw: string;
};

function cleanAIText(text: string) {
  return text
    .replace(/\*\*/g, "")
    .replace(/###/g, "")
    .replace(/##/g, "")
    .replace(/#/g, "")
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normaliseRisk(value?: string) {
  const risk = value?.toLowerCase();

  if (risk === "high") return "High";
  if (risk === "medium" || risk === "moderate") return "Medium";
  if (risk === "low") return "Low";

  return "Unknown";
}

export function parseAIResponse(text: string): ParsedAIResponse {
  const clean = cleanAIText(text);

  const riskMatch =
    clean.match(/Risk Level:\s*(Low|Medium|Moderate|High)/i) ||
    clean.match(/\b(Low|Medium|Moderate|High)\s*Risk\b/i);

  const summaryMatch = clean.match(
    /Summary:\s*([\s\S]*?)(?=Concerns:|Concern:|Recommendation:|Recommended:|Safety Note:|$)/i
  );

  const concernsMatch = clean.match(
    /Concerns?:\s*([\s\S]*?)(?=Recommendation:|Recommended:|Safety Note:|$)/i
  );

  const recommendationMatch = clean.match(
    /Recommendations?:\s*([\s\S]*?)(?=Safety Note:|$)/i
  );

  const concerns =
    concernsMatch?.[1]
      ?.split("\n")
      .map((line) => line.replace(/^[-•]\s*/, "").trim())
      .filter(Boolean)
      .slice(0, 4) ?? [];

  const summary =
    summaryMatch?.[1]?.trim() ||
    clean
      .replace(/Risk Level:\s*(Low|Medium|Moderate|High)/i, "")
      .slice(0, 420)
      .trim();

  return {
    riskLevel: normaliseRisk(riskMatch?.[1]),
    summary,
    concerns,
    recommendation:
      recommendationMatch?.[1]?.trim() ||
      "Continue monitoring and review patient vitals regularly.",
    raw: clean,
  };
}