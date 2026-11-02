import { create } from "zustand";

export type Theme = "dark" | "light";

export const THEME_STORAGE_KEY = "td.theme";

function readTheme(): Theme {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.classList.contains("light") ? "light" : "dark";
}

/**
 * The initial theme is applied to <html> by an inline script in the root layout before
 * first paint; this store mirrors and changes it.
 */
export const useThemeStore = create<{ theme: Theme; setTheme: (t: Theme) => void }>((set) => ({
  theme: readTheme(),
  setTheme: (theme) => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.classList.toggle("light", theme === "light");
    root.style.colorScheme = theme;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Storage may be unavailable (private mode); the theme still applies for this session.
    }
    set({ theme });
  },
}));
