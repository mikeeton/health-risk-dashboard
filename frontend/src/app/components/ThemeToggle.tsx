import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { loadTheme, saveTheme } from "../utils/storage";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">(loadTheme());

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    saveTheme(theme);
  }, [theme]);

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 transition hover:scale-105 dark:bg-slate-800"
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      {theme === "dark" ? (
        <Sun className="h-5 w-5 text-yellow-400" />
      ) : (
        <Moon className="h-5 w-5 text-blue-600" />
      )}
    </button>
  );
}
