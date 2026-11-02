import { describe, expect, it } from "vitest";
import { formatCompact, formatINR, formatPct, formatPrice, formatSignedINR, roundToTick } from "./format";
import { searchInstruments, DEFAULT_INSTRUMENTS } from "./instruments";

describe("formatting", () => {
  it("uses Indian digit grouping", () => {
    expect(formatPrice(1234567.5)).toBe("12,34,567.50");
    expect(formatINR(-1500)).toBe("-₹1,500.00");
    expect(formatSignedINR(250)).toBe("+₹250.00");
  });

  it("formats lakhs and crores compactly", () => {
    expect(formatCompact(12_500)).toBe("12.5K");
    expect(formatCompact(2_50_000)).toBe("2.50L");
    expect(formatCompact(3_45_00_000)).toBe("3.45Cr");
  });

  it("signs percentages", () => {
    expect(formatPct(1.234)).toBe("+1.23%");
    expect(formatPct(-0.5)).toBe("-0.50%");
  });

  it("rounds to tick size without float noise", () => {
    expect(roundToTick(101.03)).toBe(101.05);
    expect(roundToTick(101.02)).toBe(101);
  });
});

describe("searchInstruments", () => {
  it("ranks exact and prefix symbol matches before name matches", () => {
    expect(searchInstruments(DEFAULT_INSTRUMENTS, "infy")[0]!.symbol).toBe("INFY");
    expect(searchInstruments(DEFAULT_INSTRUMENTS, "bank").map((i) => i.symbol)[0]).toBe("BANKNIFTY");
    expect(searchInstruments(DEFAULT_INSTRUMENTS, "tata").map((i) => i.symbol)).toContain("TCS");
  });
});
