import type { HealthData } from "../data/healthData";

const HEALTH_DATA_KEY = "health-risk-dashboard-data";
const THEME_KEY = "health-risk-dashboard-theme";
export type AppTheme = "light" | "dark";

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

export function saveTheme(theme: AppTheme) {
  localStorage.setItem(THEME_KEY, theme);
}

export function getSavedTheme(): AppTheme | null {
  const saved = localStorage.getItem(THEME_KEY);

  if (saved === "dark" || saved === "light") return saved;

  return null;
}

export function loadTheme(): AppTheme {
  const saved = getSavedTheme();

  if (saved) return saved;

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}
