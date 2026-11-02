import {
  DEFAULT_INSTRUMENTS,
  IST_OFFSET_SECONDS,
  bucketStart,
  istDateKey,
  roundToTick,
  timeframeToSeconds,
  type Candle,
  type HistoryRequest,
  type Instrument,
  type Quote,
  type Tick,
  type Timeframe,
} from "@td/shared";
import { MarketDataError } from "../errors";
import {
  DEFAULT_HISTORY_LIMIT,
  MAX_HISTORY_LIMIT,
  type ConnectionState,
  type MarketDataProvider,
  type ProviderInfo,
  type Unsubscribe,
} from "../provider";
import { Rng } from "./random";
import { DEFAULT_SIM_PARAMS, SIM_PARAMS, type SimParams } from "./sim-params";

export interface MockProviderOptions {
  /** How often the simulated feed emits a tick batch. */
  tickIntervalMs?: number;
  /** Multiplier on simulated volatility so price action is visible in a demo. */
  speed?: number;
  /** Artificial latency for request/response calls, to exercise loading states. */
  latencyMs?: number;
  /** Clock injection for tests. */
  now?: () => number;
  instruments?: readonly Instrument[];
}

interface SymbolState {
  instrument: Instrument;
  params: SimParams;
  rng: Rng;
  prevClose: number;
  open: number;
  high: number;
  low: number;
  ltp: number;
  volume: number;
  timestamp: number;
}

interface HistoryCache {
  candles: Candle[];
  rng: Rng;
}

const SESSION_SECONDS = 6.25 * 3600; // 09:15–15:30
const TRADING_YEAR_SECONDS = 252 * SESSION_SECONDS;
/** Mean reversion towards the anchor price per bar, keeps long histories in a sane range. */
const MEAN_REVERSION = 0.004;
const HISTORY_CACHE_MAX = 5000;

/**
 * Development provider that SIMULATES an NSE-like feed with a seeded random walk.
 *
 * Every value it produces is synthetic. `info.simulated` is true and the UI labels all
 * data from this provider as simulated. Intraday history is generated as a continuous
 * timeline (no session gaps) so the demo works at any time of day.
 */
export class MockMarketDataProvider implements MarketDataProvider {
  readonly info: ProviderInfo = { id: "mock", name: "Simulated feed", simulated: true };

  private readonly opts: Required<Omit<MockProviderOptions, "instruments">>;
  private readonly instruments: readonly Instrument[];
  private readonly states = new Map<string, SymbolState>();
  private readonly history = new Map<string, HistoryCache>();
  private readonly subscribed = new Set<string>();
  private readonly tickListeners = new Set<(ticks: Tick[]) => void>();
  private readonly stateListeners = new Set<(s: ConnectionState) => void>();
  private connectionState: ConnectionState = "disconnected";
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly feedRng: Rng;

  constructor(options: MockProviderOptions = {}) {
    this.opts = {
      tickIntervalMs: options.tickIntervalMs ?? 500,
      speed: options.speed ?? 3,
      latencyMs: options.latencyMs ?? 0,
      now: options.now ?? Date.now,
    };
    this.instruments = options.instruments ?? DEFAULT_INSTRUMENTS;
    this.feedRng = new Rng(`feed:${this.opts.now()}`);
  }

  // ---- connection ---------------------------------------------------------------------

  async connect(): Promise<void> {
    if (this.connectionState === "connected") return;
    this.setState("connecting");
    await this.delay();
    this.setState("connected");
    this.syncTimer();
  }

  async disconnect(): Promise<void> {
    this.setState("disconnected");
    this.syncTimer();
  }

  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  onConnectionStateChange(listener: (state: ConnectionState) => void): Unsubscribe {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  // ---- request / response -------------------------------------------------------------

  async getInstruments(): Promise<Instrument[]> {
    await this.delay();
    return [...this.instruments];
  }

  async getQuotes(symbols: readonly string[]): Promise<Quote[]> {
    await this.delay();
    return symbols.map((s) => this.toQuote(this.state(s)));
  }

  async getHistory(request: HistoryRequest): Promise<Candle[]> {
    await this.delay();
    const limit = Math.min(Math.max(1, request.limit ?? DEFAULT_HISTORY_LIMIT), MAX_HISTORY_LIMIT);
    const state = this.state(request.symbol);
    const cache = this.historyFor(state, request.timeframe);

    if (request.before === undefined) {
      this.extendBackward(state, request.timeframe, cache, limit);
      return cache.candles.slice(-limit).map((c) => ({ ...c }));
    }

    let end = lowerBound(cache.candles, request.before);
    while (end < limit && cache.candles.length < HISTORY_CACHE_MAX) {
      const before = cache.candles.length;
      this.extendBackward(state, request.timeframe, cache, cache.candles.length + limit);
      end = lowerBound(cache.candles, request.before);
      if (cache.candles.length === before) break;
    }
    return cache.candles.slice(Math.max(0, end - limit), end).map((c) => ({ ...c }));
  }

  // ---- streaming ----------------------------------------------------------------------

  subscribe(symbols: readonly string[]): void {
    for (const s of symbols) {
      this.state(s); // validates the symbol
      this.subscribed.add(s);
    }
    this.syncTimer();
  }

  unsubscribe(symbols: readonly string[]): void {
    for (const s of symbols) this.subscribed.delete(s);
    this.syncTimer();
  }

  onTicks(listener: (ticks: Tick[]) => void): Unsubscribe {
    this.tickListeners.add(listener);
    return () => this.tickListeners.delete(listener);
  }

  /** Advances the simulation by one step. Public so tests can drive it without timers. */
  step(): Tick[] {
    const now = this.opts.now();
    const dt = this.opts.tickIntervalMs / 1000;
    const ticks: Tick[] = [];
    for (const symbol of this.subscribed) {
      // Not every instrument trades on every interval.
      if (this.feedRng.next() > 0.6) continue;
      const s = this.state(symbol);
      const sigma = s.params.annualVol * Math.sqrt(dt / TRADING_YEAR_SECONDS) * this.opts.speed;
      const pull = -0.0005 * Math.log(s.ltp / s.prevClose);
      const ltp = roundToTick(s.ltp * Math.exp(pull + sigma * this.feedRng.normal()), s.instrument.tickSize);
      const perTickVolume = (s.params.avgDailyVolume * dt) / SESSION_SECONDS / 0.6;
      const traded =
        s.params.avgDailyVolume === 0 ? 0 : Math.max(1, Math.round(perTickVolume * this.feedRng.logNormal(0.8)));

      s.ltp = ltp;
      s.high = Math.max(s.high, ltp);
      s.low = Math.min(s.low, ltp);
      s.volume += traded;
      s.timestamp = now;
      ticks.push({ symbol, ltp, timestamp: now, lastQty: traded, cumulativeVolume: s.volume });
    }
    if (ticks.length > 0) for (const l of this.tickListeners) l(ticks);
    return ticks;
  }

  // ---- internals ----------------------------------------------------------------------

  private syncTimer(): void {
    const shouldRun = this.connectionState === "connected" && this.subscribed.size > 0;
    if (shouldRun && !this.timer) {
      this.timer = setInterval(() => this.step(), this.opts.tickIntervalMs);
    } else if (!shouldRun && this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private setState(state: ConnectionState): void {
    this.connectionState = state;
    for (const l of this.stateListeners) l(state);
  }

  private delay(): Promise<void> {
    if (this.opts.latencyMs <= 0) return Promise.resolve();
    return new Promise((resolve) => setTimeout(resolve, this.opts.latencyMs));
  }

  private state(symbol: string): SymbolState {
    const existing = this.states.get(symbol);
    if (existing) return existing;

    const instrument = this.instruments.find((i) => i.symbol === symbol);
    if (!instrument) throw new MarketDataError("UNKNOWN_SYMBOL", `Unknown symbol: ${symbol}`);
    const params = SIM_PARAMS[symbol] ?? DEFAULT_SIM_PARAMS;
    const now = this.opts.now();
    // Seed per symbol per IST day: stable across reloads within a day, different each day.
    const rng = new Rng(`${symbol}:${istDateKey(now)}`);
    const dailySigma = params.annualVol / Math.sqrt(252);
    const tick = instrument.tickSize;

    const prevClose = roundToTick(params.basePrice * rng.logNormal(dailySigma * 2), tick);
    const open = roundToTick(prevClose * rng.logNormal(dailySigma * 0.3), tick);
    const ltp = roundToTick(open * rng.logNormal(dailySigma * 0.6), tick);
    const state: SymbolState = {
      instrument,
      params,
      rng,
      prevClose,
      open,
      high: roundToTick(Math.max(open, ltp) * (1 + Math.abs(rng.normal()) * dailySigma * 0.3), tick),
      low: roundToTick(Math.min(open, ltp) * (1 - Math.abs(rng.normal()) * dailySigma * 0.3), tick),
      ltp,
      volume: Math.round(params.avgDailyVolume * 0.5 * rng.logNormal(0.3)),
      timestamp: now,
    };
    this.states.set(symbol, state);
    return state;
  }

  private toQuote(s: SymbolState): Quote {
    const change = s.ltp - s.prevClose;
    return {
      symbol: s.instrument.symbol,
      ltp: s.ltp,
      open: s.open,
      high: s.high,
      low: s.low,
      prevClose: s.prevClose,
      change,
      changePct: (change / s.prevClose) * 100,
      volume: s.volume,
      timestamp: s.timestamp,
    };
  }

  private historyFor(state: SymbolState, tf: Timeframe): HistoryCache {
    const key = `${state.instrument.symbol}:${tf}`;
    let cache = this.history.get(key);
    const nowBucket = bucketStart(Math.floor(this.opts.now() / 1000), tf);

    if (!cache) {
      cache = { candles: [this.liveBar(state, tf, nowBucket)], rng: new Rng(`${key}:${istDateKey(this.opts.now())}`) };
      this.history.set(key, cache);
      return cache;
    }

    // Bring the cached series up to date with the live simulated price.
    const last = cache.candles[cache.candles.length - 1]!;
    if (last.time === nowBucket) {
      last.close = state.ltp;
      last.high = Math.max(last.high, state.ltp);
      last.low = Math.min(last.low, state.ltp);
    } else if (nowBucket > last.time) {
      const size = timeframeToSeconds(tf);
      const missing = Math.round((nowBucket - last.time) / size);
      if (missing > 1000) {
        // Idle for a long time: regenerate rather than bridging thousands of bars.
        this.history.delete(key);
        return this.historyFor(state, tf);
      }
      const times: number[] = [];
      for (let i = 1; i <= missing; i++) {
        const time = last.time + i * size;
        if (i === missing || !isNonTradingDay(time, tf)) times.push(time);
      }
      let prev = last.close;
      times.forEach((time, i) => {
        // Bridge linearly towards the live price over the missing bars.
        const remaining = times.length - i;
        const close = remaining === 1 ? state.ltp : roundToTick(prev + (state.ltp - prev) / remaining);
        cache.candles.push(this.barBetween(cache.rng, state, tf, time, prev, close));
        prev = close;
      });
    }
    return cache;
  }

  /** The bar for the current bucket, consistent with the live quote. */
  private liveBar(state: SymbolState, tf: Timeframe, time: number): Candle {
    if (tf === "1D") {
      return { time, open: state.open, high: state.high, low: state.low, close: state.ltp, volume: state.volume };
    }
    const sigma = this.barSigma(state, tf);
    const open = roundToTick(state.ltp / state.rng.logNormal(sigma * 0.5));
    return this.barBetween(state.rng, state, tf, time, open, state.ltp);
  }

  /** Generates older bars by walking backwards from the oldest cached bar. */
  private extendBackward(state: SymbolState, tf: Timeframe, cache: HistoryCache, target: number): void {
    const size = timeframeToSeconds(tf);
    const sigma = this.barSigma(state, tf);
    const anchor = Math.log(state.params.basePrice);
    const older: Candle[] = [];
    const gapped = (price: number) =>
      roundToTick(isGapTimeframe(tf) ? price * Math.exp(cache.rng.normal() * sigma * 0.25) : price);
    let first = cache.candles[0]!;
    // For daily bars the bar before today closes exactly at the quote's previous close.
    let close = tf === "1D" && cache.candles.length === 1 ? state.prevClose : gapped(first.open);

    while (cache.candles.length + older.length < Math.min(target, HISTORY_CACHE_MAX)) {
      const pull = MEAN_REVERSION * (Math.log(close) - anchor);
      const open = roundToTick(close * Math.exp(-(sigma * cache.rng.normal()) + pull));
      let time = first.time - size;
      while (isNonTradingDay(time, tf)) time -= size;
      const bar = this.barBetween(cache.rng, state, tf, time, open, close);
      older.push(bar);
      first = bar;
      close = gapped(open);
    }
    if (older.length > 0) cache.candles.unshift(...older.reverse());
  }

  private barBetween(rng: Rng, state: SymbolState, tf: Timeframe, time: number, open: number, close: number): Candle {
    const sigma = this.barSigma(state, tf);
    const high = Math.max(open, close) * Math.exp(Math.abs(rng.normal()) * sigma * 0.4);
    const low = Math.min(open, close) * Math.exp(-Math.abs(rng.normal()) * sigma * 0.4);
    const sessionFraction = Math.min(timeframeToSeconds(tf), SESSION_SECONDS) / SESSION_SECONDS;
    const days = tf === "1W" ? 5 : 1;
    const volume = Math.round(state.params.avgDailyVolume * sessionFraction * days * rng.logNormal(0.35));
    return { time, open, high: roundToTick(high), low: roundToTick(low), close, volume };
  }

  private barSigma(state: SymbolState, tf: Timeframe): number {
    const seconds = tf === "1D" ? SESSION_SECONDS : tf === "1W" ? 5 * SESSION_SECONDS : timeframeToSeconds(tf);
    return state.params.annualVol * Math.sqrt(seconds / TRADING_YEAR_SECONDS);
  }
}

/**
 * Daily history skips weekends like an exchange calendar would. (Exchange holidays are
 * not modelled. Intraday history is a continuous 24h timeline so the demo is lively at
 * any hour — see the class comment.)
 */
function isNonTradingDay(timeSec: number, tf: Timeframe): boolean {
  if (tf !== "1D") return false;
  const day = new Date((timeSec + IST_OFFSET_SECONDS) * 1000).getUTCDay();
  return day === 0 || day === 6;
}

function isGapTimeframe(tf: Timeframe): boolean {
  return tf === "1D" || tf === "1W";
}

/** Index of the first candle with time >= `time`. */
function lowerBound(candles: readonly Candle[], time: number): number {
  let lo = 0;
  let hi = candles.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (candles[mid]!.time < time) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}
