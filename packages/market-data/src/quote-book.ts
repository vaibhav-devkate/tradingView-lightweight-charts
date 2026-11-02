import type { Quote, Tick } from "@td/shared";

/**
 * Maintains the latest quote per symbol by applying ticks on top of a snapshot from
 * `getQuotes`. Ticks for symbols without a snapshot are ignored, because change/% change
 * cannot be computed without the previous close.
 */
export class QuoteBook {
  private readonly quotes = new Map<string, Quote>();

  setSnapshot(quotes: readonly Quote[]): void {
    for (const q of quotes) this.quotes.set(q.symbol, { ...q });
  }

  get(symbol: string): Quote | undefined {
    return this.quotes.get(symbol);
  }

  has(symbol: string): boolean {
    return this.quotes.has(symbol);
  }

  /** Applies a tick and returns the updated quote (a new object), or undefined if unknown. */
  apply(tick: Tick): Quote | undefined {
    const prev = this.quotes.get(tick.symbol);
    if (!prev || tick.timestamp < prev.timestamp) return undefined;
    const change = tick.ltp - prev.prevClose;
    const next: Quote = {
      ...prev,
      ltp: tick.ltp,
      high: Math.max(prev.high, tick.ltp),
      low: Math.min(prev.low, tick.ltp),
      change,
      changePct: prev.prevClose === 0 ? 0 : (change / prev.prevClose) * 100,
      volume: tick.cumulativeVolume ?? prev.volume + (tick.lastQty ?? 0),
      timestamp: tick.timestamp,
    };
    this.quotes.set(tick.symbol, next);
    return next;
  }
}
