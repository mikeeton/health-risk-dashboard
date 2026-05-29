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
    .trim();
}

export function parseAIResponse(text: string): ParsedAIResponse {
  const clean = cleanAIText(text);

  const riskMatch =
    clean.match(/Risk Level:\s*(Low|Medium|High)/i) ||
    clean.match(/\b(Low|Medium|High)\s*Risk\b/i) ||
    clean.match(/\b(Low|Medium|High)\b/i);

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
      .filter(Boolean) ?? [];

  const fallbackSummary =
    clean.length > 600 ? `${clean.slice(0, 600).trim()}...` : clean;

  return {
    riskLevel: (riskMatch?.[1] as ParsedAIResponse["riskLevel"]) ?? "Unknown",
    summary: summaryMatch?.[1]?.trim() || fallbackSummary,
    concerns,
    recommendation:
      recommendationMatch?.[1]?.trim() ||
      "Continue monitoring and review patient vitals regularly.",
    raw: clean,
  };
}