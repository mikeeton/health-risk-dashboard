import type { HealthData } from "../data/healthData";

const HEALTH_DATA_KEY = "health-risk-dashboard-data";
const THEME_KEY = "health-risk-dashboard-theme";

export function saveHealthData(data: HealthData[]) {
  localStorage.setItem(HEALTH_DATA_KEY, JSON.stringify(data));
}

export function loadHealthData(): HealthData[] | null {
  const saved = localStorage.getItem(HEALTH_DATA_KEY);
  if (!saved) return null;

  try {
    return JSON.parse(saved) as HealthData[];
  } catch {
    return null;
  }
}

export function saveTheme(theme: "light" | "dark") {
  localStorage.setItem(THEME_KEY, theme);
}

export function loadTheme(): "light" | "dark" {
  const saved = localStorage.getItem(THEME_KEY);
  return saved === "dark" ? "dark" : "light";
}