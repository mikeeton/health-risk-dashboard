const THEME_KEY = "health-risk-dashboard-theme";
export type AppTheme = "light" | "dark";

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

export function applyTheme(theme: AppTheme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.dataset.theme = theme;
}
