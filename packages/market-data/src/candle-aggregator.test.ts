import { describe, expect, it } from "vitest";
import { CandleAggregator } from "./candle-aggregator";

const ist = (iso: string) => Date.parse(`${iso}+05:30`);
const sec = (iso: string) => ist(iso) / 1000;

describe("CandleAggregator", () => {
  it("builds OHLC within a bucket and opens a new bar on the next bucket", () => {
    const agg = new CandleAggregator("5m");
    expect(agg.apply({ symbol: "X", ltp: 100, timestamp: ist("2024-03-12T10:00:10") })).toMatchObject({
      isNewBar: true,
      candle: { time: sec("2024-03-12T10:00:00"), open: 100, high: 100, low: 100, close: 100 },
    });
    agg.apply({ symbol: "X", ltp: 104, timestamp: ist("2024-03-12T10:01:00") });
    const r = agg.apply({ symbol: "X", ltp: 98, timestamp: ist("2024-03-12T10:04:59") });
    expect(r).toMatchObject({ isNewBar: false, candle: { open: 100, high: 104, low: 98, close: 98 } });

    const next = agg.apply({ symbol: "X", ltp: 99, timestamp: ist("2024-03-12T10:05:00") });
    expect(next).toMatchObject({ isNewBar: true, candle: { time: sec("2024-03-12T10:05:00"), open: 99 } });
  });

  it("derives volume from cumulative session volume deltas", () => {
    const agg = new CandleAggregator("1m");
    agg.apply({ symbol: "X", ltp: 1, timestamp: ist("2024-03-12T10:00:01"), cumulativeVolume: 1000 });
    agg.apply({ symbol: "X", ltp: 1, timestamp: ist("2024-03-12T10:00:02"), cumulativeVolume: 1250 });
    const r = agg.apply({ symbol: "X", ltp: 1, timestamp: ist("2024-03-12T10:00:03"), cumulativeVolume: 1300 });
    // first reading is only a baseline
    expect(r!.candle.volume).toBe(300);
  });

  it("falls back to last trade quantity", () => {
    const agg = new CandleAggregator("1m");
    agg.apply({ symbol: "X", ltp: 1, timestamp: ist("2024-03-12T10:00:01"), lastQty: 5 });
    const r = agg.apply({ symbol: "X", ltp: 1, timestamp: ist("2024-03-12T10:00:02"), lastQty: 7 });
    expect(r!.candle.volume).toBe(12);
  });

  it("continues a seeded historical candle and ignores stale ticks", () => {
    const agg = new CandleAggregator("1h");
    const time = sec("2024-03-12T10:15:00");
    agg.seed({ time, open: 50, high: 55, low: 45, close: 52, volume: 900 });
    const r = agg.apply({ symbol: "X", ltp: 56, timestamp: ist("2024-03-12T10:30:00"), lastQty: 100 });
    expect(r).toMatchObject({
      isNewBar: false,
      candle: { time, open: 50, high: 56, low: 45, close: 56, volume: 1000 },
    });
    expect(agg.apply({ symbol: "X", ltp: 1, timestamp: ist("2024-03-12T09:20:00") })).toBeNull();
  });
});
