import type { Theme } from "@/lib/stores/theme-store";

export interface ChartPalette {
  background: string;
  text: string;
  grid: string;
  border: string;
  crosshair: string;
  up: string;
  down: string;
  volumeUp: string;
  volumeDown: string;
  area: string;
  areaTop: string;
  areaBottom: string;
  level: string;
}

/** Mirrors the CSS tokens in globals.css (the chart canvas can't read CSS variables). */
export const CHART_PALETTES: Record<Theme, ChartPalette> = {
  dark: {
    background: "#0f1219",
    text: "#8b93a7",
    grid: "#161b25",
    border: "#232937",
    crosshair: "#5d6577",
    up: "#22ab94",
    down: "#f23645",
    volumeUp: "rgba(34, 171, 148, 0.35)",
    volumeDown: "rgba(242, 54, 69, 0.35)",
    area: "#2962ff",
    areaTop: "rgba(41, 98, 255, 0.28)",
    areaBottom: "rgba(41, 98, 255, 0.02)",
    level: "#4a5163",
  },
  light: {
    background: "#ffffff",
    text: "#5d6477",
    grid: "#f0f2f6",
    border: "#e0e3eb",
    crosshair: "#9598a1",
    up: "#089981",
    down: "#e5333f",
    volumeUp: "rgba(8, 153, 129, 0.3)",
    volumeDown: "rgba(229, 51, 63, 0.3)",
    area: "#2962ff",
    areaTop: "rgba(41, 98, 255, 0.2)",
    areaBottom: "rgba(41, 98, 255, 0.01)",
    level: "#b2b5be",
  },
};
