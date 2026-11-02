import { describe, expect, it } from "vitest";
import { computePortfolioSummary, positionPnl } from "./portfolio";
import type { Quote } from "./types";

const quote = (symbol: string, ltp: number, prevClose: number): Quote => ({
  symbol,
  ltp,
  prevClose,
  open: prevClose,
  high: ltp,
  low: ltp,
  change: ltp - prevClose,
  changePct: ((ltp - prevClose) / prevClose) * 100,
  volume: 0,
  timestamp: 0,
});

describe("computePortfolioSummary", () => {
  const holdings = [
    { symbol: "AAA", quantity: 10, avgPrice: 100 },
    { symbol: "BBB", quantity: 5, avgPrice: 200 },
  ];

  it("computes investment, value, total and day P&L", () => {
    const s = computePortfolioSummary(holdings, { AAA: quote("AAA", 110, 105), BBB: quote("BBB", 180, 190) });
    expect(s.totalInvestment).toBe(2000);
    expect(s.currentValue).toBe(1100 + 900);
    expect(s.totalPnl).toBe(0);
    expect(s.dayPnl).toBe(10 * 5 + 5 * -10);
    expect(s.holdings[0]!.pnlPct).toBeCloseTo(10);
    expect(s.holdings[1]!.pnlPct).toBeCloseTo(-10);
  });

  it("allocates by symbol and sector", () => {
    const s = computePortfolioSummary(holdings, { AAA: quote("AAA", 150, 150), BBB: quote("BBB", 100, 100) }, (sym) =>
      sym === "AAA" ? "IT" : "Banking",
    );
    expect(s.allocationBySymbol.map((a) => [a.key, a.pct])).toEqual([
      ["AAA", 75],
      ["BBB", 25],
    ]);
    expect(s.allocationBySector[0]).toMatchObject({ key: "IT", value: 1500 });
  });

  it("values holdings at cost until a quote arrives", () => {
    const s = computePortfolioSummary(holdings, {});
    expect(s.currentValue).toBe(s.totalInvestment);
    expect(s.totalPnl).toBe(0);
    expect(s.holdings[0]!.ltp).toBeNull();
  });
});

describe("positionPnl", () => {
  it("handles long and short positions", () => {
    expect(positionPnl({ symbol: "A", product: "MIS", quantity: 10, avgPrice: 100 }, 105)).toBe(50);
    expect(positionPnl({ symbol: "A", product: "MIS", quantity: -10, avgPrice: 100 }, 105)).toBe(-50);
  });
});
