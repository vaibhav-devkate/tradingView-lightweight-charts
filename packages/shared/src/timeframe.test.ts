import { describe, expect, it } from "vitest";
import { bucketStart, IST_OFFSET_SECONDS } from "./timeframe";

/** Epoch seconds for a wall-clock time in IST. */
const ist = (iso: string) => Date.parse(`${iso}+05:30`) / 1000;

describe("bucketStart", () => {
  it("aligns minute timeframes on clock boundaries", () => {
    expect(bucketStart(ist("2024-03-12T10:07:42"), "1m")).toBe(ist("2024-03-12T10:07:00"));
    expect(bucketStart(ist("2024-03-12T10:07:42"), "5m")).toBe(ist("2024-03-12T10:05:00"));
    expect(bucketStart(ist("2024-03-12T10:07:42"), "15m")).toBe(ist("2024-03-12T10:00:00"));
  });

  it("anchors 30m and hourly buckets to the 09:15 session open", () => {
    expect(bucketStart(ist("2024-03-12T09:20:00"), "30m")).toBe(ist("2024-03-12T09:15:00"));
    expect(bucketStart(ist("2024-03-12T09:50:00"), "30m")).toBe(ist("2024-03-12T09:45:00"));
    expect(bucketStart(ist("2024-03-12T10:14:59"), "1h")).toBe(ist("2024-03-12T09:15:00"));
    expect(bucketStart(ist("2024-03-12T10:15:00"), "1h")).toBe(ist("2024-03-12T10:15:00"));
    expect(bucketStart(ist("2024-03-12T14:00:00"), "4h")).toBe(ist("2024-03-12T13:15:00"));
  });

  it("starts daily buckets at IST midnight, not UTC midnight", () => {
    // 02:00 IST on the 12th is still the 11th in UTC.
    expect(bucketStart(ist("2024-03-12T02:00:00"), "1D")).toBe(ist("2024-03-12T00:00:00"));
    expect(ist("2024-03-12T00:00:00") % 86400).toBe(86400 - IST_OFFSET_SECONDS);
  });

  it("starts weekly buckets on Monday IST", () => {
    // 2024-03-14 is a Thursday; the week starts Monday 2024-03-11.
    expect(bucketStart(ist("2024-03-14T12:00:00"), "1W")).toBe(ist("2024-03-11T00:00:00"));
    expect(bucketStart(ist("2024-03-17T23:59:59"), "1W")).toBe(ist("2024-03-11T00:00:00"));
    expect(bucketStart(ist("2024-03-18T00:00:00"), "1W")).toBe(ist("2024-03-18T00:00:00"));
  });
});
