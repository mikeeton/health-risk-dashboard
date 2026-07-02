import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { getSavedTheme, loadTheme, saveTheme, type AppTheme } from "../utils/storage";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<AppTheme>(loadTheme());

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const syncSystemTheme = () => {
      if (!getSavedTheme()) setTheme(query.matches ? "dark" : "light");
    };

    query.addEventListener("change", syncSystemTheme);
    return () => query.removeEventListener("change", syncSystemTheme);
  }, []);

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    saveTheme(nextTheme);
  }

  return (
    <button
      onClick={toggleTheme}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-blue-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-900 dark:text-yellow-300 dark:hover:bg-slate-800"
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={theme === "dark"}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      {theme === "dark" ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
    </button>
  );
}
