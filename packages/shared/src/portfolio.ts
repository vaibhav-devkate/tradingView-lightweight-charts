import type { Holding, Position, Quote } from "./types";

export interface HoldingMetrics extends Holding {
  ltp: number | null;
  investment: number;
  /** Falls back to cost when no quote is available yet. */
  currentValue: number;
  pnl: number;
  pnlPct: number;
  dayPnl: number;
  dayChangePct: number;
}

export interface AllocationSlice {
  key: string;
  value: number;
  pct: number;
}

export interface PortfolioSummary {
  totalInvestment: number;
  currentValue: number;
  totalPnl: number;
  totalPnlPct: number;
  dayPnl: number;
  /** Day P&L relative to yesterday's closing value of the holdings. */
  dayPnlPct: number;
  holdings: HoldingMetrics[];
  allocationBySymbol: AllocationSlice[];
  allocationBySector: AllocationSlice[];
}

export function computeHoldingMetrics(holding: Holding, quote: Quote | undefined): HoldingMetrics {
  const investment = holding.quantity * holding.avgPrice;
  if (!quote) {
    return {
      ...holding,
      ltp: null,
      investment,
      currentValue: investment,
      pnl: 0,
      pnlPct: 0,
      dayPnl: 0,
      dayChangePct: 0,
    };
  }
  const currentValue = holding.quantity * quote.ltp;
  const pnl = currentValue - investment;
  return {
    ...holding,
    ltp: quote.ltp,
    investment,
    currentValue,
    pnl,
    pnlPct: investment === 0 ? 0 : (pnl / investment) * 100,
    dayPnl: holding.quantity * (quote.ltp - quote.prevClose),
    dayChangePct: quote.changePct,
  };
}

export function computePortfolioSummary(
  holdings: readonly Holding[],
  quotes: Readonly<Record<string, Quote | undefined>>,
  sectorOf: (symbol: string) => string = () => "Other",
): PortfolioSummary {
  const metrics = holdings.map((h) => computeHoldingMetrics(h, quotes[h.symbol]));
  const totalInvestment = sum(metrics.map((m) => m.investment));
  const currentValue = sum(metrics.map((m) => m.currentValue));
  const dayPnl = sum(metrics.map((m) => m.dayPnl));
  const totalPnl = currentValue - totalInvestment;
  const prevValue = currentValue - dayPnl;

  return {
    totalInvestment,
    currentValue,
    totalPnl,
    totalPnlPct: totalInvestment === 0 ? 0 : (totalPnl / totalInvestment) * 100,
    dayPnl,
    dayPnlPct: prevValue === 0 ? 0 : (dayPnl / prevValue) * 100,
    holdings: metrics,
    allocationBySymbol: allocate(metrics.map((m) => [m.symbol, m.currentValue])),
    allocationBySector: allocate(metrics.map((m) => [sectorOf(m.symbol), m.currentValue])),
  };
}

/** Unrealised P&L of an open position (works for both long and short). */
export function positionPnl(position: Position, ltp: number): number {
  return (ltp - position.avgPrice) * position.quantity;
}

function allocate(entries: [string, number][]): AllocationSlice[] {
  const byKey = new Map<string, number>();
  for (const [key, value] of entries) byKey.set(key, (byKey.get(key) ?? 0) + value);
  const total = sum([...byKey.values()]);
  return [...byKey.entries()]
    .map(([key, value]) => ({ key, value, pct: total === 0 ? 0 : (value / total) * 100 }))
    .sort((a, b) => b.value - a.value);
}

function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}
