import type { Candle } from "../types";
import { istDayStart } from "../timeframe";

/**
 * Pure technical indicator functions.
 *
 * Every function returns an array the same length as its input, with `null` for indexes
 * where the indicator is not yet defined (warm-up period). This keeps outputs index-aligned
 * with the source candles so charts can map value[i] -> candle[i].time directly.
 */
export type Series = (number | null)[];

export function sma(values: readonly number[], period: number): Series {
  assertPeriod(period);
  const out: Series = new Array(values.length).fill(null);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i]!;
    if (i >= period) sum -= values[i - period]!;
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

/**
 * Exponential moving average seeded with the SMA of the first `period` defined values
 * (the convention used by TradingView and most charting platforms).
 * Leading `null`s in the input are skipped, which lets EMA be chained (e.g. MACD signal).
 */
export function ema(values: readonly (number | null)[], period: number): Series {
  assertPeriod(period);
  const out: Series = new Array(values.length).fill(null);
  const k = 2 / (period + 1);
  const start = values.findIndex((v) => v !== null);
  if (start === -1) return out;

  let seedSum = 0;
  let count = 0;
  let prev: number | null = null;
  for (let i = start; i < values.length; i++) {
    const v = values[i];
    if (v === null || v === undefined) continue;
    if (prev === null) {
      seedSum += v;
      count++;
      if (count === period) {
        prev = seedSum / period;
        out[i] = prev;
      }
    } else {
      prev = v * k + prev * (1 - k);
      out[i] = prev;
    }
  }
  return out;
}

/** Relative Strength Index using Wilder's smoothing. */
export function rsi(values: readonly number[], period = 14): Series {
  assertPeriod(period);
  const out: Series = new Array(values.length).fill(null);
  if (values.length <= period) return out;

  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const diff = values[i]! - values[i - 1]!;
    if (diff >= 0) gain += diff;
    else loss -= diff;
  }
  let avgGain = gain / period;
  let avgLoss = loss / period;
  out[period] = toRsi(avgGain, avgLoss);

  for (let i = period + 1; i < values.length; i++) {
    const diff = values[i]! - values[i - 1]!;
    avgGain = (avgGain * (period - 1) + Math.max(diff, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-diff, 0)) / period;
    out[i] = toRsi(avgGain, avgLoss);
  }
  return out;
}

function toRsi(avgGain: number, avgLoss: number): number {
  if (avgLoss === 0) return avgGain === 0 ? 50 : 100;
  return 100 - 100 / (1 + avgGain / avgLoss);
}

export interface MacdResult {
  macd: Series;
  signal: Series;
  histogram: Series;
}

export function macd(values: readonly number[], fast = 12, slow = 26, signalPeriod = 9): MacdResult {
  if (fast >= slow) throw new RangeError("MACD fast period must be shorter than slow period");
  const fastEma = ema(values, fast);
  const slowEma = ema(values, slow);
  const macdLine: Series = values.map((_, i) => {
    const f = fastEma[i];
    const s = slowEma[i];
    return f == null || s == null ? null : f - s;
  });
  const signal = ema(macdLine, signalPeriod);
  const histogram: Series = macdLine.map((m, i) => {
    const s = signal[i];
    return m == null || s == null ? null : m - s;
  });
  return { macd: macdLine, signal, histogram };
}

export interface BollingerResult {
  upper: Series;
  middle: Series;
  lower: Series;
}

/** Bollinger Bands using the population standard deviation (TradingView convention). */
export function bollinger(values: readonly number[], period = 20, stdDev = 2): BollingerResult {
  assertPeriod(period);
  const middle = sma(values, period);
  const upper: Series = new Array(values.length).fill(null);
  const lower: Series = new Array(values.length).fill(null);
  for (let i = period - 1; i < values.length; i++) {
    const mean = middle[i]!;
    let variance = 0;
    for (let j = i - period + 1; j <= i; j++) variance += (values[j]! - mean) ** 2;
    const sd = Math.sqrt(variance / period);
    upper[i] = mean + stdDev * sd;
    lower[i] = mean - stdDev * sd;
  }
  return { upper, middle, lower };
}

/**
 * Volume-weighted average price using typical price (H+L+C)/3, anchored to a session.
 * By default the anchor resets each IST calendar day. Bars with zero cumulative volume
 * (e.g. indices, which carry no volume) yield `null`.
 */
export function vwap(candles: readonly Candle[], sessionKey: (timeSec: number) => number = istDayStart): Series {
  const out: Series = new Array(candles.length).fill(null);
  let session: number | null = null;
  let pv = 0;
  let vol = 0;
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i]!;
    const key = sessionKey(c.time);
    if (key !== session) {
      session = key;
      pv = 0;
      vol = 0;
    }
    pv += ((c.high + c.low + c.close) / 3) * c.volume;
    vol += c.volume;
    out[i] = vol > 0 ? pv / vol : null;
  }
  return out;
}

function assertPeriod(period: number): void {
  if (!Number.isInteger(period) || period < 1) throw new RangeError(`Invalid period: ${period}`);
}
