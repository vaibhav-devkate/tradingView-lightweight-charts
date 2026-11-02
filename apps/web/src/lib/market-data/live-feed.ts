import { QuoteBook, SubscriptionManager, type ConnectionState, type Unsubscribe } from "@td/market-data";
import type { Quote, Tick } from "@td/shared";
import { create } from "zustand";
import { useQuotesStore } from "../stores/quotes-store";
import { getMarketDataClient, type MarketDataClient } from "./client";

/** Quote updates are coalesced and pushed to React at most this often. */
const FLUSH_INTERVAL_MS = 250;

export const useFeedStatus = create<{ state: ConnectionState; error: string | null }>(() => ({
  state: "disconnected",
  error: null,
}));

/**
 * Single owner of the realtime connection in the browser.
 *
 * - Ref-counts symbol interest from many components so the upstream feed sees one
 *   subscribe/unsubscribe per symbol.
 * - Keeps a QuoteBook (snapshot + ticks) and flushes changed quotes to the Zustand store
 *   in batches, so a burst of ticks causes one React update.
 * - Fans raw ticks out to per-symbol listeners (the chart's candle aggregator).
 */
class LiveFeed {
  private readonly subs = new SubscriptionManager();
  private readonly book = new QuoteBook();
  private readonly tickListeners = new Map<string, Set<(tick: Tick) => void>>();
  private readonly dirty = new Map<string, Quote>();
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private started = false;

  constructor(private readonly client: MarketDataClient) {}

  get info() {
    return this.client.info;
  }

  get api(): MarketDataClient {
    return this.client;
  }

  start(): void {
    if (this.started) return;
    this.started = true;
    this.client.onConnectionStateChange((state) => useFeedStatus.setState({ state }));
    this.client.onTicks((ticks) => this.handleTicks(ticks));
    this.client.connect().catch((err: unknown) => {
      useFeedStatus.setState({ state: "error", error: err instanceof Error ? err.message : String(err) });
    });
  }

  /** Registers interest in symbols; returns a release function. */
  acquire(symbols: readonly string[]): Unsubscribe {
    this.start();
    const added = this.subs.acquire(symbols);
    if (added.length > 0) {
      // Snapshot first so ticks have a prevClose to compute change against.
      this.client
        .getQuotes(added)
        .then((quotes) => {
          const live = quotes.filter((q) => this.subs.isActive(q.symbol));
          this.book.setSnapshot(live);
          useQuotesStore.getState().upsert(live);
          this.client.subscribe(live.map((q) => q.symbol));
        })
        .catch((err: unknown) => console.error("[feed] snapshot failed", err));
    }
    let released = false;
    return () => {
      if (released) return;
      released = true;
      const removed = this.subs.release(symbols);
      if (removed.length > 0) this.client.unsubscribe(removed);
    };
  }

  /** Raw ticks for one symbol (used for candle aggregation). Also acquires the symbol. */
  onTick(symbol: string, listener: (tick: Tick) => void): Unsubscribe {
    const release = this.acquire([symbol]);
    let set = this.tickListeners.get(symbol);
    if (!set) this.tickListeners.set(symbol, (set = new Set()));
    set.add(listener);
    return () => {
      set.delete(listener);
      if (set.size === 0) this.tickListeners.delete(symbol);
      release();
    };
  }

  private handleTicks(ticks: Tick[]): void {
    for (const tick of ticks) {
      const quote = this.book.apply(tick);
      if (quote) this.dirty.set(quote.symbol, quote);
      const listeners = this.tickListeners.get(tick.symbol);
      if (listeners) for (const l of listeners) l(tick);
    }
    if (this.dirty.size > 0 && !this.flushTimer) {
      this.flushTimer = setTimeout(() => this.flush(), FLUSH_INTERVAL_MS);
    }
  }

  private flush(): void {
    this.flushTimer = null;
    const quotes = [...this.dirty.values()];
    this.dirty.clear();
    useQuotesStore.getState().upsert(quotes);
  }
}

let feed: LiveFeed | null = null;

export function getLiveFeed(): LiveFeed {
  if (!feed) feed = new LiveFeed(getMarketDataClient());
  return feed;
}
