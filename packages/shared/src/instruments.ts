import type { Instrument } from "./types";

/**
 * Static instrument metadata for the initial universe. This is reference data only
 * (symbols, names, sectors) — it contains NO prices. Real providers will replace this
 * with the exchange instrument master downloaded at startup.
 */
const eq = (symbol: string, name: string, sector: string): Instrument => ({
  symbol,
  name,
  exchange: "NSE",
  type: "EQ",
  sector,
  tickSize: 0.05,
  lotSize: 1,
});

const index = (symbol: string, name: string, exchange: "NSE" | "BSE" = "NSE"): Instrument => ({
  symbol,
  name,
  exchange,
  type: "INDEX",
  sector: "Index",
  tickSize: 0.05,
  lotSize: 1,
});

export const DEFAULT_INSTRUMENTS: readonly Instrument[] = [
  index("NIFTY50", "NIFTY 50"),
  index("BANKNIFTY", "NIFTY BANK"),
  index("NIFTYIT", "NIFTY IT"),
  index("SENSEX", "S&P BSE SENSEX", "BSE"),
  eq("RELIANCE", "Reliance Industries Ltd", "Energy"),
  eq("TCS", "Tata Consultancy Services Ltd", "IT"),
  eq("INFY", "Infosys Ltd", "IT"),
  eq("HDFCBANK", "HDFC Bank Ltd", "Banking"),
  eq("ICICIBANK", "ICICI Bank Ltd", "Banking"),
  eq("SBIN", "State Bank of India", "Banking"),
  eq("KOTAKBANK", "Kotak Mahindra Bank Ltd", "Banking"),
  eq("AXISBANK", "Axis Bank Ltd", "Banking"),
  eq("BHARTIARTL", "Bharti Airtel Ltd", "Telecom"),
  eq("ITC", "ITC Ltd", "FMCG"),
  eq("HINDUNILVR", "Hindustan Unilever Ltd", "FMCG"),
  eq("LT", "Larsen & Toubro Ltd", "Infrastructure"),
  eq("BAJFINANCE", "Bajaj Finance Ltd", "Financial Services"),
  eq("MARUTI", "Maruti Suzuki India Ltd", "Automobile"),
  eq("SUNPHARMA", "Sun Pharmaceutical Industries Ltd", "Pharma"),
  eq("TITAN", "Titan Company Ltd", "Consumer Durables"),
  eq("WIPRO", "Wipro Ltd", "IT"),
  eq("HCLTECH", "HCL Technologies Ltd", "IT"),
  eq("ASIANPAINT", "Asian Paints Ltd", "Consumer Durables"),
  eq("ULTRACEMCO", "UltraTech Cement Ltd", "Cement"),
  eq("NTPC", "NTPC Ltd", "Power"),
];

export const INDEX_SYMBOLS = DEFAULT_INSTRUMENTS.filter((i) => i.type === "INDEX").map((i) => i.symbol);

/** Case-insensitive search over symbol and company name; symbol-prefix matches rank first. */
export function searchInstruments(instruments: readonly Instrument[], query: string, limit = 20): Instrument[] {
  const q = query.trim().toUpperCase();
  if (!q) return instruments.slice(0, limit);
  const scored: [number, Instrument][] = [];
  for (const inst of instruments) {
    const symbol = inst.symbol.toUpperCase();
    const name = inst.name.toUpperCase();
    let score = -1;
    if (symbol === q) score = 0;
    else if (symbol.startsWith(q)) score = 1;
    else if (name.startsWith(q)) score = 2;
    else if (symbol.includes(q)) score = 3;
    else if (name.includes(q)) score = 4;
    if (score >= 0) scored.push([score, inst]);
  }
  return scored
    .sort((a, b) => a[0] - b[0] || a[1].symbol.localeCompare(b[1].symbol))
    .slice(0, limit)
    .map(([, inst]) => inst);
}
