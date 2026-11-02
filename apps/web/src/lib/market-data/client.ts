import { MockMarketDataProvider, type MarketDataProvider } from "@td/market-data";

/**
 * The browser-side view of market data. It has the same shape as a provider so the UI
 * is agnostic of where data comes from:
 *
 * - "mock" (Phase 1–2): the simulated provider runs in the browser. It needs no
 *   credentials, so nothing sensitive is exposed.
 * - "api" (Phase 5+): a Socket.IO/REST client talking to our backend, which holds broker
 *   credentials and runs the real FYERS/Kite adapters. Broker adapters never run here.
 */
export type MarketDataClient = MarketDataProvider;

export type MarketDataSource = "mock";

let client: MarketDataClient | null = null;

export function getMarketDataClient(): MarketDataClient {
  if (client) return client;
  const source = (process.env.NEXT_PUBLIC_MARKET_DATA_SOURCE ?? "mock") as MarketDataSource;
  switch (source) {
    case "mock":
    default:
      client = new MockMarketDataProvider({ tickIntervalMs: 500, latencyMs: 120 });
  }
  return client;
}
