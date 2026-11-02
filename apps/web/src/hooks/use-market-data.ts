"use client";

import { DEFAULT_INSTRUMENTS, getMarketStatus, type Instrument, type MarketStatus, type Quote } from "@td/shared";
import { useEffect, useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { getLiveFeed } from "@/lib/market-data/live-feed";
import { useQuotesStore } from "@/lib/stores/quotes-store";

/** Subscribes to live quotes for `symbols` while the component is mounted. */
export function useLiveQuotes(symbols: readonly string[]): Record<string, Quote | undefined> {
  const key = [...new Set(symbols)].sort().join(",");
  useEffect(() => {
    if (!key) return;
    return getLiveFeed().acquire(key.split(","));
  }, [key]);
  return useQuotesStore(
    useShallow((s) => {
      const out: Record<string, Quote | undefined> = {};
      for (const sym of symbols) out[sym] = s.quotes[sym];
      return out;
    }),
  );
}

const instrumentMap = new Map(DEFAULT_INSTRUMENTS.map((i) => [i.symbol, i]));

/**
 * Instrument reference data. The default universe is static metadata (no prices); once
 * the API exists this will come from the exchange instrument master.
 */
export function useInstruments(): {
  instruments: readonly Instrument[];
  bySymbol: (s: string) => Instrument | undefined;
} {
  return useMemo(() => ({ instruments: DEFAULT_INSTRUMENTS, bySymbol: (s: string) => instrumentMap.get(s) }), []);
}

export function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function useMarketStatus(): MarketStatus {
  const now = useNow(15_000);
  return getMarketStatus(now);
}
