import { describe, expect, it } from "vitest";
import type { Candle } from "../types";
import { bollinger, ema, macd, rsi, sma, vwap } from "./core";

describe("sma", () => {
  it("averages a rolling window and nulls the warm-up period", () => {
    expect(sma([1, 2, 3, 4, 5], 3)).toEqual([null, null, 2, 3, 4]);
  });

  it("rejects invalid periods", () => {
    expect(() => sma([1, 2], 0)).toThrow(RangeError);
    expect(() => sma([1, 2], 1.5)).toThrow(RangeError);
  });
});

describe("ema", () => {
  it("seeds with the SMA and then applies the smoothing factor", () => {
    const out = ema([1, 2, 3, 4, 5], 3);
    // seed = (1+2+3)/3 = 2; k = 0.5 -> 4*0.5+2*0.5 = 3; 5*0.5+3*0.5 = 4
    expect(out).toEqual([null, null, 2, 3, 4]);
  });

  it("skips leading nulls so it can be chained", () => {
    expect(ema([null, null, 2, 4, 6], 2)).toEqual([null, null, null, 3, 5]);
  });
});

describe("rsi", () => {
  // Classic Wilder example dataset (as published by StockCharts).
  const closes = [
    44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.1, 45.42, 45.84, 46.08, 45.89, 46.03, 45.61, 46.28, 46.28, 46.0, 46.03,
    46.41, 46.22, 45.64,
  ];

  it("matches the reference values", () => {
    const out = rsi(closes, 14);
    expect(out.slice(0, 14).every((v) => v === null)).toBe(true);
    // The published table rounds intermediate averages to 2dp (70.53, 66.32, 66.55);
    // unrounded Wilder smoothing differs by < 0.1.
    expect(Math.abs(out[14]! - 70.53)).toBeLessThan(0.1);
    expect(Math.abs(out[15]! - 66.32)).toBeLessThan(0.1);
    expect(Math.abs(out[16]! - 66.55)).toBeLessThan(0.1);
  });

  it("is 100 for a strictly rising series and stays within bounds", () => {
    const rising = Array.from({ length: 30 }, (_, i) => 100 + i);
    expect(rsi(rising, 14)[29]).toBe(100);
    const noisy = Array.from({ length: 200 }, (_, i) => 100 + Math.sin(i / 3) * 5 + (i % 7));
    for (const v of rsi(noisy, 14))
      if (v !== null) (expect(v).toBeGreaterThanOrEqual(0), expect(v).toBeLessThanOrEqual(100));
  });
});

describe("macd", () => {
  it("is the difference of fast and slow EMAs with a signal EMA", () => {
    const closes = Array.from({ length: 60 }, (_, i) => 100 + i * 0.5 + Math.sin(i) * 2);
    const { macd: line, signal, histogram } = macd(closes, 12, 26, 9);
    const fast = ema(closes, 12);
    const slow = ema(closes, 26);
    expect(line[24]).toBeNull();
    expect(line[25]).toBeCloseTo(fast[25]! - slow[25]!, 10);
    // signal needs 9 MACD values: first at index 25 + 8
    expect(signal[32]).toBeNull();
    expect(signal[33]).not.toBeNull();
    expect(histogram[40]).toBeCloseTo(line[40]! - signal[40]!, 10);
  });

  it("requires fast < slow", () => {
    expect(() => macd([1, 2, 3], 26, 12)).toThrow(RangeError);
  });
});

describe("bollinger", () => {
  it("uses population standard deviation around the SMA", () => {
    const { upper, middle, lower } = bollinger([2, 4, 4, 4, 5, 5, 7, 9], 8, 2);
    // mean 5, population sd 2
    expect(middle[7]).toBe(5);
    expect(upper[7]).toBe(9);
    expect(lower[7]).toBe(1);
    expect(upper[6]).toBeNull();
  });
});

describe("vwap", () => {
  const day = 86400;
  const bar = (time: number, price: number, volume: number): Candle => ({
    time,
    open: price,
    high: price,
    low: price,
    close: price,
    volume,
  });

  it("weights typical price by volume and resets each session", () => {
    const t0 = 1_700_000_000;
    const candles = [bar(t0, 100, 10), bar(t0 + 60, 110, 30), bar(t0 + day, 200, 5)];
    const out = vwap(candles);
    expect(out[0]).toBe(100);
    expect(out[1]).toBeCloseTo((100 * 10 + 110 * 30) / 40, 10);
    expect(out[2]).toBe(200);
  });

  it("returns null when there is no volume (e.g. indices)", () => {
    expect(vwap([bar(1_700_000_000, 100, 0)])).toEqual([null]);
  });
});
