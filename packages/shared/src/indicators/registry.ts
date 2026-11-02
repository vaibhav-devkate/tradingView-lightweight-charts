import type { Candle } from "../types";
import { bollinger, ema, macd, rsi, sma, vwap, type Series } from "./core";

export type IndicatorType = "sma" | "ema" | "rsi" | "macd" | "bb" | "vwap" | "volume";

/** A user-configured indicator instance on a chart. */
export interface IndicatorConfig {
  /** Unique per chart, e.g. "sma-1700000000000" */
  id: string;
  type: IndicatorType;
  params: Record<string, number>;
  /** Colour per output key, e.g. { sma: "#f5a623" } */
  colors: Record<string, string>;
  visible: boolean;
}

export interface IndicatorParamDef {
  key: string;
  label: string;
  default: number;
  min: number;
  max: number;
  step: number;
}

export type OutputStyle = "line" | "histogram";

export interface IndicatorOutputDef {
  key: string;
  label: string;
  style: OutputStyle;
  defaultColor: string;
}

export interface IndicatorDefinition {
  type: IndicatorType;
  name: string;
  shortName: string;
  /** Overlays share the price pane; others get their own pane below. */
  placement: "overlay" | "pane";
  params: IndicatorParamDef[];
  outputs: IndicatorOutputDef[];
  /** Horizontal reference lines for oscillators (e.g. RSI 30/70). */
  levels?: number[];
  /** Whether multiple instances make sense (e.g. SMA 20 and SMA 50). */
  allowMultiple: boolean;
}

export const INDICATOR_DEFINITIONS: Record<IndicatorType, IndicatorDefinition> = {
  sma: {
    type: "sma",
    name: "Simple Moving Average",
    shortName: "SMA",
    placement: "overlay",
    params: [{ key: "period", label: "Length", default: 20, min: 1, max: 500, step: 1 }],
    outputs: [{ key: "sma", label: "SMA", style: "line", defaultColor: "#f5a623" }],
    allowMultiple: true,
  },
  ema: {
    type: "ema",
    name: "Exponential Moving Average",
    shortName: "EMA",
    placement: "overlay",
    params: [{ key: "period", label: "Length", default: 50, min: 1, max: 500, step: 1 }],
    outputs: [{ key: "ema", label: "EMA", style: "line", defaultColor: "#4c9aff" }],
    allowMultiple: true,
  },
  bb: {
    type: "bb",
    name: "Bollinger Bands",
    shortName: "BB",
    placement: "overlay",
    params: [
      { key: "period", label: "Length", default: 20, min: 2, max: 500, step: 1 },
      { key: "stdDev", label: "StdDev", default: 2, min: 0.5, max: 5, step: 0.5 },
    ],
    outputs: [
      { key: "upper", label: "Upper", style: "line", defaultColor: "#9c6ade" },
      { key: "middle", label: "Basis", style: "line", defaultColor: "#e0a3ff" },
      { key: "lower", label: "Lower", style: "line", defaultColor: "#9c6ade" },
    ],
    allowMultiple: false,
  },
  vwap: {
    type: "vwap",
    name: "VWAP (session)",
    shortName: "VWAP",
    placement: "overlay",
    params: [],
    outputs: [{ key: "vwap", label: "VWAP", style: "line", defaultColor: "#00bcd4" }],
    allowMultiple: false,
  },
  volume: {
    type: "volume",
    name: "Volume",
    shortName: "Vol",
    placement: "overlay",
    params: [],
    outputs: [{ key: "volume", label: "Volume", style: "histogram", defaultColor: "#5d606b" }],
    allowMultiple: false,
  },
  rsi: {
    type: "rsi",
    name: "Relative Strength Index",
    shortName: "RSI",
    placement: "pane",
    params: [{ key: "period", label: "Length", default: 14, min: 2, max: 100, step: 1 }],
    outputs: [{ key: "rsi", label: "RSI", style: "line", defaultColor: "#b388ff" }],
    levels: [30, 70],
    allowMultiple: false,
  },
  macd: {
    type: "macd",
    name: "MACD",
    shortName: "MACD",
    placement: "pane",
    params: [
      { key: "fast", label: "Fast", default: 12, min: 1, max: 200, step: 1 },
      { key: "slow", label: "Slow", default: 26, min: 2, max: 400, step: 1 },
      { key: "signal", label: "Signal", default: 9, min: 1, max: 100, step: 1 },
    ],
    outputs: [
      { key: "histogram", label: "Histogram", style: "histogram", defaultColor: "#26a69a" },
      { key: "macd", label: "MACD", style: "line", defaultColor: "#2962ff" },
      { key: "signal", label: "Signal", style: "line", defaultColor: "#ff6d00" },
    ],
    allowMultiple: false,
  },
};

export function createIndicatorConfig(type: IndicatorType, id: string): IndicatorConfig {
  const def = INDICATOR_DEFINITIONS[type];
  return {
    id,
    type,
    params: Object.fromEntries(def.params.map((p) => [p.key, p.default])),
    colors: Object.fromEntries(def.outputs.map((o) => [o.key, o.defaultColor])),
    visible: true,
  };
}

/** Short legend label, e.g. "SMA 20" or "MACD 12 26 9". */
export function indicatorLabel(config: IndicatorConfig): string {
  const def = INDICATOR_DEFINITIONS[config.type];
  const params = def.params.map((p) => config.params[p.key] ?? p.default);
  return [def.shortName, ...params].join(" ");
}

/** Clamp/round user-entered params to the definition's bounds. */
export function sanitizeIndicatorParams(type: IndicatorType, params: Record<string, number>): Record<string, number> {
  const def = INDICATOR_DEFINITIONS[type];
  const out: Record<string, number> = {};
  for (const p of def.params) {
    const raw = Number(params[p.key]);
    const value = Number.isFinite(raw) ? raw : p.default;
    const stepped = Math.round(value / p.step) * p.step;
    out[p.key] = Math.min(p.max, Math.max(p.min, Number(stepped.toFixed(6))));
  }
  return out;
}

/** Computes all outputs of an indicator, index-aligned with `candles`. */
export function computeIndicator(config: IndicatorConfig, candles: readonly Candle[]): Record<string, Series> {
  const p = sanitizeIndicatorParams(config.type, config.params);
  const closes = candles.map((c) => c.close);
  switch (config.type) {
    case "sma":
      return { sma: sma(closes, p.period!) };
    case "ema":
      return { ema: ema(closes, p.period!) };
    case "rsi":
      return { rsi: rsi(closes, p.period!) };
    case "macd": {
      const fast = Math.min(p.fast!, p.slow! - 1);
      return { ...macd(closes, Math.max(1, fast), p.slow!, p.signal!) };
    }
    case "bb":
      return { ...bollinger(closes, p.period!, p.stdDev!) };
    case "vwap":
      return { vwap: vwap(candles) };
    case "volume":
      return { volume: candles.map((c) => c.volume) };
  }
}
