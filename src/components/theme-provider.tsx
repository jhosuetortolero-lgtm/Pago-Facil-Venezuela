"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

type Theme = "light" | "dark";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem("pagofacil-theme") as Theme | null;
    const preferred = saved ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    // A preferência só existe no navegador; é restaurada após a hidratação.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(preferred);
    setReady(true);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;
    if (ready) window.localStorage.setItem("pagofacil-theme", theme);
  }, [theme, ready]);

  return <>{children}<button type="button" aria-label={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"} aria-pressed={theme === "dark"} onClick={() => setTheme((current) => current === "dark" ? "light" : "dark")} className="pf-theme-toggle fixed right-5 top-5 z-[60] flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-slate-700 shadow-lg backdrop-blur transition hover:scale-105 dark:border-white/15 dark:bg-slate-900/90 dark:text-yellow-300">{theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}</button></>;
}
