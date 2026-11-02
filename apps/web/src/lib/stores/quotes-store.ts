import type { Quote } from "@td/shared";
import { create } from "zustand";

export interface QuotesState {
  quotes: Record<string, Quote>;
  /** Direction of the last price change per symbol, for tick flashes. */
  direction: Record<string, 1 | -1 | 0>;
  /** Increments on every price change; components key flashes on it. */
  seq: Record<string, number>;
  upsert: (quotes: readonly Quote[]) => void;
}

export const useQuotesStore = create<QuotesState>((set) => ({
  quotes: {},
  direction: {},
  seq: {},
  upsert: (incoming) =>
    set((state) => {
      const quotes = { ...state.quotes };
      const direction = { ...state.direction };
      const seq = { ...state.seq };
      for (const q of incoming) {
        const prev = quotes[q.symbol];
        quotes[q.symbol] = q;
        if (prev && prev.ltp !== q.ltp) {
          direction[q.symbol] = q.ltp > prev.ltp ? 1 : -1;
          seq[q.symbol] = (seq[q.symbol] ?? 0) + 1;
        }
      }
      return { quotes, direction, seq };
    }),
}));

export const useQuote = (symbol: string): Quote | undefined => useQuotesStore((s) => s.quotes[symbol]);
