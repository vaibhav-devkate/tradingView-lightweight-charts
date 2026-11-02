import {
  createIndicatorConfig,
  INDICATOR_DEFINITIONS,
  sanitizeIndicatorParams,
  type ChartType,
  type IndicatorConfig,
  type IndicatorType,
  type Timeframe,
} from "@td/shared";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface ChartPrefs {
  symbol: string;
  timeframe: Timeframe;
  chartType: ChartType;
  indicators: IndicatorConfig[];
  /** Stream live ticks into the chart. When off the chart is a static snapshot. */
  live: boolean;
  crosshairMagnet: boolean;
  logScale: boolean;
}

interface ChartState extends ChartPrefs {
  setSymbol: (symbol: string) => void;
  setTimeframe: (tf: Timeframe) => void;
  setChartType: (type: ChartType) => void;
  setLive: (live: boolean) => void;
  setCrosshairMagnet: (on: boolean) => void;
  setLogScale: (on: boolean) => void;
  addIndicator: (type: IndicatorType) => void;
  updateIndicator: (id: string, patch: Partial<Pick<IndicatorConfig, "params" | "colors" | "visible">>) => void;
  removeIndicator: (id: string) => void;
  resetIndicators: () => void;
}

let seq = 0;
const indicatorId = (type: IndicatorType) => `${type}-${Date.now().toString(36)}-${seq++}`;

function defaultIndicators(): IndicatorConfig[] {
  const ema = createIndicatorConfig("ema", "ema-default");
  ema.params = { period: 50 };
  return [
    createIndicatorConfig("volume", "volume-default"),
    createIndicatorConfig("sma", "sma-default"),
    ema,
    createIndicatorConfig("rsi", "rsi-default"),
  ];
}

/** Chart preferences persisted per browser; Phase 4 syncs them to the user's profile. */
export const useChartStore = create<ChartState>()(
  persist(
    (set) => ({
      symbol: "NIFTY50",
      timeframe: "5m",
      chartType: "candlestick",
      indicators: defaultIndicators(),
      live: true,
      crosshairMagnet: false,
      logScale: false,
      setSymbol: (symbol) => set({ symbol }),
      setTimeframe: (timeframe) => set({ timeframe }),
      setChartType: (chartType) => set({ chartType }),
      setLive: (live) => set({ live }),
      setCrosshairMagnet: (crosshairMagnet) => set({ crosshairMagnet }),
      setLogScale: (logScale) => set({ logScale }),
      addIndicator: (type) =>
        set(({ indicators }) => {
          if (!INDICATOR_DEFINITIONS[type].allowMultiple && indicators.some((i) => i.type === type)) return {};
          return { indicators: [...indicators, createIndicatorConfig(type, indicatorId(type))] };
        }),
      updateIndicator: (id, patch) =>
        set(({ indicators }) => ({
          indicators: indicators.map((i) =>
            i.id === id
              ? {
                  ...i,
                  ...patch,
                  params: patch.params ? sanitizeIndicatorParams(i.type, patch.params) : i.params,
                  colors: patch.colors ? { ...i.colors, ...patch.colors } : i.colors,
                }
              : i,
          ),
        })),
      removeIndicator: (id) => set(({ indicators }) => ({ indicators: indicators.filter((i) => i.id !== id) })),
      resetIndicators: () => set({ indicators: defaultIndicators() }),
    }),
    {
      name: "td.chart",
      version: 1,
      partialize: ({ symbol, timeframe, chartType, indicators, live, crosshairMagnet, logScale }) => ({
        symbol,
        timeframe,
        chartType,
        indicators,
        live,
        crosshairMagnet,
        logScale,
      }),
    },
  ),
);
