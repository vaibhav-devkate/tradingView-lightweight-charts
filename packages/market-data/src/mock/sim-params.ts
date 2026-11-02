/**
 * Parameters for the SIMULATED price generator.
 *
 * `basePrice` is only the anchor level around which the random walk wanders so that
 * charts look plausible in scale. These are NOT live, delayed or historical market prices
 * and must never be displayed as such.
 */
export interface SimParams {
  basePrice: number;
  /** Annualised volatility, e.g. 0.25 = 25%. */
  annualVol: number;
  /** Typical shares traded per session (0 for indices). */
  avgDailyVolume: number;
}

export const SIM_PARAMS: Record<string, SimParams> = {
  NIFTY50: { basePrice: 24000, annualVol: 0.13, avgDailyVolume: 0 },
  BANKNIFTY: { basePrice: 52000, annualVol: 0.16, avgDailyVolume: 0 },
  NIFTYIT: { basePrice: 38000, annualVol: 0.2, avgDailyVolume: 0 },
  SENSEX: { basePrice: 80000, annualVol: 0.13, avgDailyVolume: 0 },
  RELIANCE: { basePrice: 1400, annualVol: 0.24, avgDailyVolume: 9_000_000 },
  TCS: { basePrice: 3400, annualVol: 0.22, avgDailyVolume: 2_500_000 },
  INFY: { basePrice: 1500, annualVol: 0.25, avgDailyVolume: 7_000_000 },
  HDFCBANK: { basePrice: 1900, annualVol: 0.2, avgDailyVolume: 12_000_000 },
  ICICIBANK: { basePrice: 1350, annualVol: 0.22, avgDailyVolume: 11_000_000 },
  SBIN: { basePrice: 800, annualVol: 0.27, avgDailyVolume: 14_000_000 },
  KOTAKBANK: { basePrice: 2000, annualVol: 0.23, avgDailyVolume: 4_000_000 },
  AXISBANK: { basePrice: 1150, annualVol: 0.26, avgDailyVolume: 8_000_000 },
  BHARTIARTL: { basePrice: 1850, annualVol: 0.22, avgDailyVolume: 6_000_000 },
  ITC: { basePrice: 420, annualVol: 0.19, avgDailyVolume: 15_000_000 },
  HINDUNILVR: { basePrice: 2400, annualVol: 0.18, avgDailyVolume: 1_500_000 },
  LT: { basePrice: 3500, annualVol: 0.23, avgDailyVolume: 2_000_000 },
  BAJFINANCE: { basePrice: 900, annualVol: 0.3, avgDailyVolume: 6_000_000 },
  MARUTI: { basePrice: 12500, annualVol: 0.22, avgDailyVolume: 500_000 },
  SUNPHARMA: { basePrice: 1700, annualVol: 0.21, avgDailyVolume: 2_500_000 },
  TITAN: { basePrice: 3400, annualVol: 0.24, avgDailyVolume: 1_200_000 },
  WIPRO: { basePrice: 260, annualVol: 0.26, avgDailyVolume: 10_000_000 },
  HCLTECH: { basePrice: 1550, annualVol: 0.24, avgDailyVolume: 3_000_000 },
  ASIANPAINT: { basePrice: 2400, annualVol: 0.22, avgDailyVolume: 1_500_000 },
  ULTRACEMCO: { basePrice: 11500, annualVol: 0.23, avgDailyVolume: 400_000 },
  NTPC: { basePrice: 340, annualVol: 0.25, avgDailyVolume: 12_000_000 },
};

export const DEFAULT_SIM_PARAMS: SimParams = { basePrice: 1000, annualVol: 0.25, avgDailyVolume: 1_000_000 };
