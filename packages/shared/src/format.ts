const priceFormatter = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const integerFormatter = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

/** 1234567.5 -> "12,34,567.50" (Indian digit grouping). */
export function formatPrice(value: number): string {
  return priceFormatter.format(value);
}

/** 1234567.5 -> "₹12,34,567.50" */
export function formatINR(value: number, opts: { compact?: boolean } = {}): string {
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  if (opts.compact) return `${sign}₹${formatCompact(abs)}`;
  return `${sign}₹${formatPrice(abs)}`;
}

/** Signed variant for P&L, e.g. "+₹1,250.00". */
export function formatSignedINR(value: number, opts: { compact?: boolean } = {}): string {
  return `${value > 0 ? "+" : ""}${formatINR(value, opts)}`;
}

export function formatPct(value: number, opts: { signed?: boolean } = { signed: true }): string {
  const s = `${value.toFixed(2)}%`;
  return opts.signed && value > 0 ? `+${s}` : s;
}

export function formatChange(value: number): string {
  const s = formatPrice(value);
  return value > 0 ? `+${s}` : s;
}

/** Indian compact notation: 12,500 -> "12.5K", 2,50,00,000 -> "2.50Cr". */
export function formatCompact(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1e7) return `${sign}${(abs / 1e7).toFixed(2)}Cr`;
  if (abs >= 1e5) return `${sign}${(abs / 1e5).toFixed(2)}L`;
  if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(1)}K`;
  return `${sign}${integerFormatter.format(abs)}`;
}

export function formatVolume(value: number): string {
  return value === 0 ? "—" : formatCompact(value);
}

/** Round to the instrument tick size (e.g. 0.05) avoiding float noise. */
export function roundToTick(price: number, tickSize = 0.05): number {
  return Number((Math.round(price / tickSize) * tickSize).toFixed(2));
}
