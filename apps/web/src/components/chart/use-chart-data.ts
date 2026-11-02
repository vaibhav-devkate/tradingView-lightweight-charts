"use client";

import { CandleAggregator, MarketDataError } from "@td/market-data";
import type { Candle, Timeframe } from "@td/shared";
import { useEffect, useRef, useState } from "react";
import { getLiveFeed } from "@/lib/market-data/live-feed";
import type { ChartController } from "./chart-controller";

export type ChartLoadState = { status: "loading" } | { status: "ready" } | { status: "error"; message: string };

const PAGE_SIZE = 500;
/** Hard cap on bars kept in memory per chart. */
const MAX_BARS = 5000;

/**
 * Loads history for the chart, keeps it live by aggregating ticks into the current bar,
 * and pages in older bars when the user scrolls back.
 */
export function useChartData(
  controller: ChartController | null,
  symbol: string,
  timeframe: Timeframe,
  live: boolean,
): { state: ChartLoadState; loadOlder: () => void; reload: () => void } {
  const [reloadKey, setReloadKey] = useState(0);
  // Results are tagged with the request they belong to, so a new symbol/timeframe reads
  // as "loading" without a synchronous setState in the effect.
  const requestKey = `${symbol}|${timeframe}|${reloadKey}`;
  const [result, setResult] = useState<{ key: string; state: ChartLoadState } | null>(null);
  const state: ChartLoadState = result?.key === requestKey ? result.state : { status: "loading" };
  const loadOlderRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (!controller) return;
    const feed = getLiveFeed();
    let cancelled = false;
    let ready = false;
    let loadingOlder = false;
    let exhausted = false;
    const aggregator = new CandleAggregator(timeframe);
    const pending = new Map<number, Candle>();
    let frame = 0;

    const setState = (next: ChartLoadState) => setResult({ key: requestKey, state: next });
    feed.api
      .getHistory({ symbol, timeframe, limit: PAGE_SIZE })
      .then((candles) => {
        if (cancelled) return;
        controller.setCandles(candles);
        aggregator.seed(candles[candles.length - 1]);
        ready = true;
        setState({ status: "ready" });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setState({
          status: "error",
          message: err instanceof MarketDataError || err instanceof Error ? err.message : "Failed to load chart data",
        });
      });

    loadOlderRef.current = () => {
      if (!ready || loadingOlder || exhausted || cancelled) return;
      const first = controller.getCandles()[0];
      if (!first || controller.getCandles().length >= MAX_BARS) return;
      loadingOlder = true;
      feed.api
        .getHistory({ symbol, timeframe, before: first.time, limit: PAGE_SIZE })
        .then((older) => {
          if (cancelled) return;
          if (older.length === 0) exhausted = true;
          controller.prependCandles(older);
        })
        .catch((err: unknown) => console.warn("[chart] older history failed", err))
        .finally(() => {
          loadingOlder = false;
        });
    };

    // Coalesce tick-driven bar updates to one canvas update per animation frame.
    const flush = () => {
      frame = 0;
      const bars = [...pending.values()].sort((a, b) => a.time - b.time);
      pending.clear();
      for (const bar of bars) controller.upsertCandle(bar);
    };

    const unsubscribe = live
      ? feed.onTick(symbol, (tick) => {
          if (!ready) return;
          const result = aggregator.apply(tick);
          if (!result) return;
          pending.set(result.candle.time, result.candle);
          if (!frame) frame = requestAnimationFrame(flush);
        })
      : () => {};

    return () => {
      cancelled = true;
      unsubscribe();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [controller, symbol, timeframe, live, requestKey]);

  return {
    state,
    loadOlder: () => loadOlderRef.current(),
    reload: () => setReloadKey((k) => k + 1),
  };
}
