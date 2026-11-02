export type MarketDataErrorCode =
  | "UNKNOWN_SYMBOL"
  | "INVALID_REQUEST"
  | "NOT_CONNECTED"
  | "AUTH_FAILED"
  | "RATE_LIMITED"
  | "NETWORK"
  | "PROVIDER_ERROR";

export class MarketDataError extends Error {
  readonly code: MarketDataErrorCode;
  /** Whether retrying the same request later may succeed. */
  readonly retryable: boolean;

  constructor(code: MarketDataErrorCode, message: string, options: { retryable?: boolean; cause?: unknown } = {}) {
    super(message, { cause: options.cause });
    this.name = "MarketDataError";
    this.code = code;
    this.retryable = options.retryable ?? (code === "RATE_LIMITED" || code === "NETWORK");
  }
}
