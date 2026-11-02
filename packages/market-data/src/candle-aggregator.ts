import { bucketStart, type Candle, type Tick, type Timeframe } from "@td/shared";

export interface AggregateResult {
  candle: Candle;
  /** True when the tick opened a new bar rather than updating the current one. */
  isNewBar: boolean;
}

/**
 * Builds OHLCV candles for one symbol and timeframe from a stream of ticks.
 *
 * Volume: feeds usually report cumulative session volume, which is robust to dropped
 * ticks, so per-bar volume is the delta between consecutive cumulative readings. If the
 * cumulative figure goes backwards (new session), it is treated as a fresh count. When a
 * feed only supplies last-trade quantity, that is used instead.
 */
export class CandleAggregator {
  private current: Candle | null = null;
  private lastCumulativeVolume: number | null = null;

  constructor(readonly timeframe: Timeframe) {}

  /** Continue from the latest historical candle so live ticks extend it seamlessly. */
  seed(lastCandle: Candle | undefined): void {
    this.current = lastCandle ? { ...lastCandle } : null;
    this.lastCumulativeVolume = null;
  }

  getCurrent(): Candle | null {
    return this.current ? { ...this.current } : null;
  }

  /** Returns the updated bar, or null if the tick is older than the current bar. */
  apply(tick: Tick): AggregateResult | null {
    const time = bucketStart(Math.floor(tick.timestamp / 1000), this.timeframe);
    const volume = this.volumeDelta(tick);

    if (this.current && time < this.current.time) return null;

    if (!this.current || time > this.current.time) {
      this.current = { time, open: tick.ltp, high: tick.ltp, low: tick.ltp, close: tick.ltp, volume };
      return { candle: { ...this.current }, isNewBar: true };
    }

    const c = this.current;
    c.high = Math.max(c.high, tick.ltp);
    c.low = Math.min(c.low, tick.ltp);
    c.close = tick.ltp;
    c.volume += volume;
    return { candle: { ...c }, isNewBar: false };
  }

  private volumeDelta(tick: Tick): number {
    if (tick.cumulativeVolume !== undefined) {
      const prev = this.lastCumulativeVolume;
      this.lastCumulativeVolume = tick.cumulativeVolume;
      if (prev === null) return 0; // first reading only establishes the baseline
      return tick.cumulativeVolume >= prev ? tick.cumulativeVolume - prev : tick.cumulativeVolume;
    }
    return tick.lastQty ?? 0;
  }
}
