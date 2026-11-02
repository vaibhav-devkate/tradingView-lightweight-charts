import type { Timeframe } from "./types";

/** India Standard Time offset from UTC, in seconds (+05:30, no DST). */
export const IST_OFFSET_SECONDS = 5.5 * 3600;

const MINUTE = 60;
const HOUR = 3600;
const DAY = 86400;
const WEEK = 7 * DAY;

/**
 * NSE cash market opens at 09:15 IST = 03:45 UTC. Intraday buckets are anchored to the
 * session open so that e.g. 1h candles run 09:15–10:15 like on Kite/FYERS rather than
 * 09:00–10:00.
 */
const SESSION_OPEN_UTC_SECONDS = 3 * HOUR + 45 * MINUTE;

const TIMEFRAME_SECONDS: Record<Timeframe, number> = {
  "1m": MINUTE,
  "5m": 5 * MINUTE,
  "15m": 15 * MINUTE,
  "30m": 30 * MINUTE,
  "1h": HOUR,
  "4h": 4 * HOUR,
  "1D": DAY,
  "1W": WEEK,
};

export const TIMEFRAME_LABELS: Record<Timeframe, string> = {
  "1m": "1m",
  "5m": "5m",
  "15m": "15m",
  "30m": "30m",
  "1h": "1H",
  "4h": "4H",
  "1D": "1D",
  "1W": "1W",
};

export function timeframeToSeconds(tf: Timeframe): number {
  return TIMEFRAME_SECONDS[tf];
}

export function isIntraday(tf: Timeframe): boolean {
  return TIMEFRAME_SECONDS[tf] < DAY;
}

function floorTo(value: number, size: number, anchor: number): number {
  return anchor + Math.floor((value - anchor) / size) * size;
}

/**
 * Start (epoch seconds) of the bucket containing `timeSec` for the given timeframe.
 * - Intraday buckets are anchored to the 09:15 IST session open.
 * - Daily buckets start at 00:00 IST.
 * - Weekly buckets start on Monday 00:00 IST.
 */
export function bucketStart(timeSec: number, tf: Timeframe): number {
  const size = TIMEFRAME_SECONDS[tf];
  if (tf === "1D") return floorTo(timeSec, DAY, -IST_OFFSET_SECONDS);
  if (tf === "1W") {
    // 1970-01-05 was a Monday.
    return floorTo(timeSec, WEEK, 4 * DAY - IST_OFFSET_SECONDS);
  }
  return floorTo(timeSec, size, SESSION_OPEN_UTC_SECONDS);
}

/** Start (epoch seconds) of the IST calendar day containing `timeSec`. */
export function istDayStart(timeSec: number): number {
  return bucketStart(timeSec, "1D");
}
