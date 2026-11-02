import type { Candle, HistoryRequest, Instrument, Quote, Tick } from "@td/shared";

export type Unsubscribe = () => void;

export type ConnectionState = "disconnected" | "connecting" | "connected" | "reconnecting" | "error";

export interface ProviderInfo {
  /** Stable identifier, e.g. "mock", "fyers", "kite". */
  id: string;
  /** Display name shown in the UI. */
  name: string;
  /**
   * True when the provider produces synthetic data. The UI MUST label such data as
   * simulated/demo and never present it as real market prices.
   */
  simulated: boolean;
}

/**
 * Contract every market data source implements (mock, FYERS, Zerodha Kite, ...).
 *
 * The application only talks to this interface, so swapping providers is a configuration
 * change. Real broker adapters run on the backend only, because they need API secrets and
 * access tokens that must never reach the browser.
 */
export interface MarketDataProvider {
  readonly info: ProviderInfo;

  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getConnectionState(): ConnectionState;
  onConnectionStateChange(listener: (state: ConnectionState) => void): Unsubscribe;

  getInstruments(): Promise<Instrument[]>;
  getQuotes(symbols: readonly string[]): Promise<Quote[]>;
  /** Candles in ascending time order. */
  getHistory(request: HistoryRequest): Promise<Candle[]>;

  /** Idempotent: subscribing to an already-subscribed symbol is a no-op. */
  subscribe(symbols: readonly string[]): void;
  unsubscribe(symbols: readonly string[]): void;
  /** Ticks are delivered in batches to keep downstream rendering cheap. */
  onTicks(listener: (ticks: Tick[]) => void): Unsubscribe;
}

export const DEFAULT_HISTORY_LIMIT = 500;
export const MAX_HISTORY_LIMIT = 2000;
