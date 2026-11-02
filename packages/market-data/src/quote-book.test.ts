import { describe, expect, it } from "vitest";
import { QuoteBook } from "./quote-book";

describe("QuoteBook", () => {
  const snapshot = {
    symbol: "X",
    ltp: 100,
    open: 98,
    high: 101,
    low: 97,
    prevClose: 95,
    change: 5,
    changePct: (5 / 95) * 100,
    volume: 1000,
    timestamp: 1000,
  };

  it("updates ltp, range, change and volume from ticks", () => {
    const book = new QuoteBook();
    book.setSnapshot([snapshot]);
    const q = book.apply({ symbol: "X", ltp: 104.5, timestamp: 2000, cumulativeVolume: 1500 });
    expect(q).toMatchObject({ ltp: 104.5, high: 104.5, low: 97, change: 9.5, volume: 1500 });
    expect(q!.changePct).toBeCloseTo(10);
  });

  it("ignores unknown symbols and out-of-order ticks", () => {
    const book = new QuoteBook();
    book.setSnapshot([snapshot]);
    expect(book.apply({ symbol: "Y", ltp: 1, timestamp: 2000 })).toBeUndefined();
    expect(book.apply({ symbol: "X", ltp: 1, timestamp: 500 })).toBeUndefined();
    expect(book.get("X")!.ltp).toBe(100);
  });
});
