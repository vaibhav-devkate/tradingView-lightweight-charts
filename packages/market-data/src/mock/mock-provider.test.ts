import { describe, expect, it } from "vitest";
import { timeframeToSeconds, TIMEFRAMES } from "@td/shared";
import { MarketDataError } from "../errors";
import { MockMarketDataProvider } from "./mock-provider";

const fixedNow = Date.parse("2024-03-12T11:00:00+05:30");
const istWeekday = (sec: number) => new Date((sec + 5.5 * 3600) * 1000).getUTCDay();

function provider(now = () => fixedNow) {
  return new MockMarketDataProvider({ now });
}

describe("MockMarketDataProvider", () => {
  it("identifies itself as simulated", () => {
    expect(provider().info.simulated).toBe(true);
  });

  it("rejects unknown symbols", async () => {
    await expect(provider().getQuotes(["NOPE"])).rejects.toBeInstanceOf(MarketDataError);
  });

  it("returns internally consistent quotes", async () => {
    const [q] = await provider().getQuotes(["RELIANCE"]);
    expect(q!.high).toBeGreaterThanOrEqual(Math.max(q!.open, q!.ltp));
    expect(q!.low).toBeLessThanOrEqual(Math.min(q!.open, q!.ltp));
    expect(q!.change).toBeCloseTo(q!.ltp - q!.prevClose, 6);
  });

  it.each(TIMEFRAMES)("generates ascending, valid %s history ending at the live price", async (tf) => {
    const p = provider();
    const candles = await p.getHistory({ symbol: "TCS", timeframe: tf, limit: 300 });
    const [q] = await p.getQuotes(["TCS"]);
    expect(candles).toHaveLength(300);
    const step = timeframeToSeconds(tf);
    for (let i = 0; i < candles.length; i++) {
      const c = candles[i]!;
      expect(c.high).toBeGreaterThanOrEqual(Math.max(c.open, c.close));
      expect(c.low).toBeLessThanOrEqual(Math.min(c.open, c.close));
      expect(c.low).toBeGreaterThan(0);
      if (i === 0) continue;
      const gap = c.time - candles[i - 1]!.time;
      if (tf === "1D") {
        // Weekends are skipped: Friday -> Monday is 3 days.
        expect([step, 3 * step]).toContain(gap);
        expect(istWeekday(c.time)).not.toBe(0);
        expect(istWeekday(c.time)).not.toBe(6);
      } else {
        expect(gap).toBe(step);
      }
    }
    expect(candles.at(-1)!.close).toBe(q!.ltp);
  });

  it("anchors the previous daily close to the quote's prevClose", async () => {
    const p = provider();
    const daily = await p.getHistory({ symbol: "INFY", timeframe: "1D", limit: 5 });
    const [q] = await p.getQuotes(["INFY"]);
    expect(daily.at(-2)!.close).toBe(q!.prevClose);
    expect(daily.at(-1)!.open).toBe(q!.open);
  });

  it("pages older history contiguously with `before`", async () => {
    const p = provider();
    const latest = await p.getHistory({ symbol: "SBIN", timeframe: "5m", limit: 100 });
    const older = await p.getHistory({ symbol: "SBIN", timeframe: "5m", before: latest[0]!.time, limit: 100 });
    expect(older).toHaveLength(100);
    expect(latest[0]!.time - older.at(-1)!.time).toBe(300);
  });

  it("emits ticks only for subscribed symbols and updates quotes", async () => {
    const p = provider();
    p.subscribe(["HDFCBANK"]);
    let ticks: { symbol: string }[] = [];
    for (let i = 0; i < 20 && ticks.length === 0; i++) ticks = p.step();
    expect(ticks.length).toBeGreaterThan(0);
    expect(ticks.every((t) => t.symbol === "HDFCBANK")).toBe(true);
    p.unsubscribe(["HDFCBANK"]);
    expect(p.step()).toEqual([]);
  });

  it("extends the live bar as simulated time passes", async () => {
    let now = fixedNow;
    const p = provider(() => now);
    const before = await p.getHistory({ symbol: "ITC", timeframe: "1m", limit: 10 });
    now += 3 * 60_000;
    const after = await p.getHistory({ symbol: "ITC", timeframe: "1m", limit: 10 });
    expect(after.at(-1)!.time - before.at(-1)!.time).toBe(180);
  });
});
