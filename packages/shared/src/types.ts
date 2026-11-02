/**
 * Core market domain types shared by the web app, API and market data providers.
 *
 * Conventions:
 * - Instrument identity is the `symbol` string (e.g. "RELIANCE", "NIFTY50").
 *   Provider adapters translate to/from their own tokens (Kite instrument_token,
 *   FYERS "NSE:RELIANCE-EQ", ...).
 * - Timestamps on ticks and quotes are epoch milliseconds.
 * - Candle `time` is epoch SECONDS of the bucket start (what Lightweight Charts expects).
 * - Prices are in INR.
 */

export type Exchange = "NSE" | "BSE";

export type InstrumentType = "EQ" | "INDEX";

export interface Instrument {
  symbol: string;
  /** Human-friendly name, e.g. "Reliance Industries Ltd" */
  name: string;
  exchange: Exchange;
  type: InstrumentType;
  sector?: string;
  /** Minimum price increment. */
  tickSize: number;
  lotSize: number;
}

/** Snapshot of the latest state of an instrument for the current session. */
export interface Quote {
  symbol: string;
  /** Last traded price */
  ltp: number;
  open: number;
  high: number;
  low: number;
  /** Previous session close; change is computed against this. */
  prevClose: number;
  change: number;
  changePct: number;
  /** Cumulative traded volume for the session. 0 for indices. */
  volume: number;
  /** Epoch ms of the last update. */
  timestamp: number;
}

/** A single market data update as delivered by a provider feed. */
export interface Tick {
  symbol: string;
  ltp: number;
  /** Epoch ms */
  timestamp: number;
  /** Quantity of the last trade, if the feed provides it. */
  lastQty?: number;
  /** Cumulative session volume, if the feed provides it (preferred for aggregation). */
  cumulativeVolume?: number;
}

export interface Candle {
  /** Epoch SECONDS of the bucket start. */
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export const TIMEFRAMES = ["1m", "5m", "15m", "30m", "1h", "4h", "1D", "1W"] as const;
export type Timeframe = (typeof TIMEFRAMES)[number];

export type ChartType = "candlestick" | "ohlc" | "line" | "area";

export interface HistoryRequest {
  symbol: string;
  timeframe: Timeframe;
  /** Return candles strictly older than this bucket start (epoch seconds). Omit for latest. */
  before?: number;
  /** Max number of candles to return. */
  limit?: number;
}

export interface Holding {
  symbol: string;
  quantity: number;
  avgPrice: number;
}

export type PositionSide = "LONG" | "SHORT";

export interface Position {
  symbol: string;
  product: "MIS" | "NRML" | "CNC";
  /** Signed quantity: positive long, negative short. */
  quantity: number;
  avgPrice: number;
}

export type OrderStatus = "OPEN" | "COMPLETE" | "CANCELLED" | "REJECTED";

export interface Order {
  id: string;
  symbol: string;
  side: "BUY" | "SELL";
  type: "MARKET" | "LIMIT" | "SL" | "SL-M";
  product: "MIS" | "NRML" | "CNC";
  quantity: number;
  filledQuantity: number;
  price: number | null;
  averagePrice: number | null;
  status: OrderStatus;
  /** Epoch ms */
  placedAt: number;
}

export interface NewsItem {
  id: string;
  headline: string;
  source: string;
  /** Epoch ms */
  publishedAt: number;
  symbols: string[];
  url?: string;
}
