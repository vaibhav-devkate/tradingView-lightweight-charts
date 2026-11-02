import { IST_OFFSET_SECONDS } from "./timeframe";

export type MarketPhase = "PRE_OPEN" | "OPEN" | "CLOSED";

export interface MarketStatus {
  phase: MarketPhase;
  label: string;
  /** Reason when closed, e.g. "Weekend" or "Holiday". */
  reason?: string;
}

const PRE_OPEN_START = 9 * 60; // 09:00 IST, minutes since midnight
const SESSION_OPEN = 9 * 60 + 15; // 09:15
const SESSION_CLOSE = 15 * 60 + 30; // 15:30

/** YYYY-MM-DD of the IST calendar date for an epoch-ms timestamp. */
export function istDateKey(epochMs: number): string {
  return new Date(epochMs + IST_OFFSET_SECONDS * 1000).toISOString().slice(0, 10);
}

/**
 * NSE equity cash-market status derived from the clock.
 *
 * Exchange holidays are not known statically; pass them (as IST "YYYY-MM-DD" strings)
 * from the exchange calendar once a provider/API supplies it. Special sessions
 * (e.g. Muhurat trading) are not modelled.
 */
export function getMarketStatus(epochMs: number, holidays: ReadonlySet<string> = new Set()): MarketStatus {
  const ist = new Date(epochMs + IST_OFFSET_SECONDS * 1000);
  const day = ist.getUTCDay();
  if (day === 0 || day === 6) return { phase: "CLOSED", label: "Market closed", reason: "Weekend" };
  if (holidays.has(istDateKey(epochMs))) return { phase: "CLOSED", label: "Market closed", reason: "Holiday" };

  const minutes = ist.getUTCHours() * 60 + ist.getUTCMinutes();
  if (minutes >= PRE_OPEN_START && minutes < SESSION_OPEN) return { phase: "PRE_OPEN", label: "Pre-open" };
  if (minutes >= SESSION_OPEN && minutes < SESSION_CLOSE) return { phase: "OPEN", label: "Market open" };
  return { phase: "CLOSED", label: "Market closed", reason: minutes < PRE_OPEN_START ? "Before open" : "After close" };
}
