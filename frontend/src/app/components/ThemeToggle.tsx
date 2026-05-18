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
      className="w-10 h-10 rounded-full bg-blue-100 dark:bg-slate-800 flex items-center justify-center hover:scale-105 transition"
    >
      {theme === "dark" ? (
        <Sun className="w-5 h-5 text-yellow-400" />
      ) : (
        <Moon className="w-5 h-5 text-blue-600" />
      )}
    </button>
  );
}