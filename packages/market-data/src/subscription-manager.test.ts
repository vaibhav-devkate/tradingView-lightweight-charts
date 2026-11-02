import { describe, expect, it } from "vitest";
import { SubscriptionManager } from "./subscription-manager";

describe("SubscriptionManager", () => {
  it("only subscribes upstream on first acquire and unsubscribes on last release", () => {
    const m = new SubscriptionManager();
    expect(m.acquire(["A", "B"])).toEqual(["A", "B"]);
    expect(m.acquire(["B", "C"])).toEqual(["C"]);
    expect(m.release(["B"])).toEqual([]);
    expect(m.release(["A", "B"])).toEqual(["A", "B"]);
    expect(m.active()).toEqual(["C"]);
  });

  it("dedupes within a call and ignores unknown releases", () => {
    const m = new SubscriptionManager();
    expect(m.acquire(["A", "A"])).toEqual(["A"]);
    expect(m.release(["Z"])).toEqual([]);
    expect(m.release(["A"])).toEqual(["A"]);
  });
});
