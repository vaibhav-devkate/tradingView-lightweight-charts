import type { Holding, NewsItem, Order, Position } from "@td/shared";

/**
 * DEMO DATA — fictional portfolio, positions, orders and headlines used until a broker
 * account and a news provider are connected (Phase 6–7). Everything that renders these
 * shows a "Demo" label. Values are priced live against the SIMULATED feed.
 */

export const DEMO_HOLDINGS: Holding[] = [
  { symbol: "RELIANCE", quantity: 40, avgPrice: 1320 },
  { symbol: "TCS", quantity: 12, avgPrice: 3620 },
  { symbol: "INFY", quantity: 35, avgPrice: 1455 },
  { symbol: "HDFCBANK", quantity: 30, avgPrice: 1710 },
  { symbol: "ICICIBANK", quantity: 45, avgPrice: 1240 },
  { symbol: "SBIN", quantity: 80, avgPrice: 765 },
  { symbol: "ITC", quantity: 150, avgPrice: 438 },
  { symbol: "LT", quantity: 10, avgPrice: 3380 },
];

export const DEMO_POSITIONS: Position[] = [
  { symbol: "BANKNIFTY", product: "NRML", quantity: 30, avgPrice: 51880 },
  { symbol: "INFY", product: "MIS", quantity: -50, avgPrice: 1512.4 },
  { symbol: "AXISBANK", product: "MIS", quantity: 100, avgPrice: 1141.25 },
];

/** Builds today's demo order book with IST session timestamps. */
export function demoOrders(now = Date.now()): Order[] {
  const istMidnight = Math.floor((now + 19_800_000) / 86_400_000) * 86_400_000 - 19_800_000;
  const at = (h: number, m: number) => istMidnight + (h * 60 + m) * 60_000;
  return [
    {
      id: "D-1001",
      symbol: "AXISBANK",
      side: "BUY",
      type: "LIMIT",
      product: "MIS",
      quantity: 100,
      filledQuantity: 100,
      price: 1141.25,
      averagePrice: 1141.25,
      status: "COMPLETE",
      placedAt: at(9, 21),
    },
    {
      id: "D-1002",
      symbol: "INFY",
      side: "SELL",
      type: "MARKET",
      product: "MIS",
      quantity: 50,
      filledQuantity: 50,
      price: null,
      averagePrice: 1512.4,
      status: "COMPLETE",
      placedAt: at(9, 47),
    },
    {
      id: "D-1003",
      symbol: "SBIN",
      side: "BUY",
      type: "LIMIT",
      product: "CNC",
      quantity: 25,
      filledQuantity: 0,
      price: 742.5,
      averagePrice: null,
      status: "OPEN",
      placedAt: at(10, 12),
    },
    {
      id: "D-1004",
      symbol: "TCS",
      side: "SELL",
      type: "SL",
      product: "CNC",
      quantity: 4,
      filledQuantity: 0,
      price: 3310,
      averagePrice: null,
      status: "OPEN",
      placedAt: at(11, 5),
    },
    {
      id: "D-1005",
      symbol: "MARUTI",
      side: "BUY",
      type: "LIMIT",
      product: "CNC",
      quantity: 2,
      filledQuantity: 0,
      price: 11980,
      averagePrice: null,
      status: "CANCELLED",
      placedAt: at(11, 40),
    },
    {
      id: "D-1006",
      symbol: "BAJFINANCE",
      side: "BUY",
      type: "MARKET",
      product: "MIS",
      quantity: 300,
      filledQuantity: 0,
      price: null,
      averagePrice: null,
      status: "REJECTED",
      placedAt: at(13, 2),
    },
  ];
}

/** Placeholder headlines that describe what the news widget will show; not real news. */
export function demoNews(now = Date.now()): NewsItem[] {
  const min = 60_000;
  return [
    {
      id: "n1",
      headline: "Sample headline — company announcements for RELIANCE will appear here",
      source: "Demo feed",
      publishedAt: now - 6 * min,
      symbols: ["RELIANCE"],
    },
    {
      id: "n2",
      headline: "Sample headline — sector news for Banking (HDFCBANK, ICICIBANK, SBIN)",
      source: "Demo feed",
      publishedAt: now - 22 * min,
      symbols: ["HDFCBANK", "ICICIBANK", "SBIN"],
    },
    {
      id: "n3",
      headline: "Sample headline — quarterly results coverage for TCS and INFY",
      source: "Demo feed",
      publishedAt: now - 48 * min,
      symbols: ["TCS", "INFY"],
    },
    {
      id: "n4",
      headline: "Sample headline — index and derivatives market wrap for NIFTY 50",
      source: "Demo feed",
      publishedAt: now - 95 * min,
      symbols: ["NIFTY50"],
    },
    {
      id: "n5",
      headline: "Sample headline — exchange circulars and corporate actions",
      source: "Demo feed",
      publishedAt: now - 180 * min,
      symbols: [],
    },
  ];
}
