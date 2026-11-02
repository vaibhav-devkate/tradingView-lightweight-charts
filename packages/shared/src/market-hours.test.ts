import { describe, expect, it } from "vitest";
import { getMarketStatus, istDateKey } from "./market-hours";

const ist = (iso: string) => Date.parse(`${iso}+05:30`);

describe("getMarketStatus", () => {
  it("reports pre-open, open and closed phases on a weekday", () => {
    expect(getMarketStatus(ist("2024-03-12T08:59:00")).phase).toBe("CLOSED");
    expect(getMarketStatus(ist("2024-03-12T09:00:00")).phase).toBe("PRE_OPEN");
    expect(getMarketStatus(ist("2024-03-12T09:15:00")).phase).toBe("OPEN");
    expect(getMarketStatus(ist("2024-03-12T15:29:59")).phase).toBe("OPEN");
    expect(getMarketStatus(ist("2024-03-12T15:30:00")).phase).toBe("CLOSED");
  });

  it("is closed on weekends and configured holidays", () => {
    expect(getMarketStatus(ist("2024-03-16T11:00:00"))).toMatchObject({ phase: "CLOSED", reason: "Weekend" });
    const holidays = new Set(["2024-03-25"]);
    expect(getMarketStatus(ist("2024-03-25T11:00:00"), holidays)).toMatchObject({ phase: "CLOSED", reason: "Holiday" });
  });

  it("derives the IST calendar date", () => {
    expect(istDateKey(Date.parse("2024-03-11T20:00:00Z"))).toBe("2024-03-12");
  });
});
