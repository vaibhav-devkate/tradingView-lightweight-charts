


import { describe, expect, it } from "vitest";
import type { Candle } from "../types";
import { computeIndicator, createIndicatorConfig, indicatorLabel, sanitizeIndicatorParams } from "./registry";

const candles: Candle[] = Array.from({ length: 100 }, (_, i) => ({
  time: 1_700_000_000 + i * 60,
  open: 100 + i,
  high: 101 + i,
  low: 99 + i,
  close: 100 + i,
  volume: 1000,
}));

describe("indicator registry", () => {
  it("creates configs with default params and colours", () => {
    const cfg = createIndicatorConfig("macd", "m1");
    expect(cfg.params).toEqual({ fast: 12, slow: 26, signal: 9 });
    expect(Object.keys(cfg.colors)).toEqual(["histogram", "macd", "signal"]);
    expect(indicatorLabel(cfg)).toBe("MACD 12 26 9");
  });

  it("clamps and steps user-entered params", () => {
    expect(sanitizeIndicatorParams("sma", { period: 9999 })).toEqual({ period: 500 });
    expect(sanitizeIndicatorParams("sma", { period: Number.NaN })).toEqual({ period: 20 });
    expect(sanitizeIndicatorParams("bb", { period: 20, stdDev: 2.3 })).toEqual({ period: 20, stdDev: 2.5 });
  });

  it("computes index-aligned outputs for every indicator type", () => {
    for (const type of ["sma", "ema", "rsi", "macd", "bb", "vwap", "volume"] as const) {
      const out = computeIndicator(createIndicatorConfig(type, type), candles);
      for (const series of Object.values(out)) expect(series).toHaveLength(candles.length);
    }
  });

  it("does not throw when a user sets MACD fast >= slow", () => {
    const cfg = { ...createIndicatorConfig("macd", "m"), params: { fast: 30, slow: 26, signal: 9 } };
    expect(() => computeIndicator(cfg, candles)).not.toThrow();
  });
});
